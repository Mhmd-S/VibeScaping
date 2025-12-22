import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/utils/auth';
import { getCreditCost, checkCreditsAvailable, deductCredits, isValidModel } from '@/app/utils/credits';
import { isModelAllowed } from '@/app/utils/subscription';
import { GoogleGenAI } from '@google/genai';
import { uploadImageToCloudflare } from '@/app/utils/cloudflare';
import { prisma } from '@/lib/prisma';

const normalizeImagePayload = (value: string): string => {
    if (!value) return '';

    if (value.startsWith('data:')) {
        const [, base64Part] = value.split(',', 2);
        return base64Part || '';
    }

    return value;
};

export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const body = await request.json();
        const { imageBase64, mimeType, prompt, model, workspaceId, isBYOK } = body;

        if (!imageBase64 || !mimeType) {
            return NextResponse.json(
                { error: 'Image data is required' },
                { status: 400 }
            );
        }

        const modelName = model || 'gemini-3-pro-image-preview';
        const byokMode = Boolean(isBYOK);

        // Validate model name (prevent model name manipulation)
        if (!isValidModel(modelName)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid model',
                    details: `Model "${modelName}" is not allowed. Please use a valid model.`,
                },
                { status: 400 }
            );
        }

        // Check model access based on tier and BYOK status
        const modelAllowed = await isModelAllowed(userId, modelName, byokMode);
        if (!modelAllowed) {
            const tier = byokMode ? 'free tier (BYOK)' : 'free tier';
            return NextResponse.json(
                {
                    success: false,
                    error: 'Model not allowed',
                    details: `Model "${modelName}" is not available for ${tier} users. Free tier users can only use gemini-2.5-flash-image with credits, or use BYOK for all models.`,
                },
                { status: 403 }
            );
        }

        // If BYOK mode, user should use their own API key client-side
        // Server should not make the API call in BYOK mode
        if (byokMode) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'BYOK mode must use client-side generation',
                    details: 'When using your own API key, image generation happens client-side. Please ensure BYOK mode is properly configured.',
                },
                { status: 400 }
            );
        }

        // For credit-based usage, check credits
        const creditCost = getCreditCost(modelName);

        // Check if user has enough credits
        const hasCredits = await checkCreditsAvailable(userId, creditCost);
        if (!hasCredits) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Insufficient credits',
                    details: `This operation requires ${creditCost} credits. Please subscribe or add credits.`,
                },
                { status: 402 }
            );
        }

        // Use server API key
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'Server API key not configured' },
                { status: 500 }
            );
        }

        const ai = new GoogleGenAI({ apiKey });

        const supportsTransparency = mimeType === 'image/png' || mimeType === 'image/webp';
        const defaultPrompt = supportsTransparency
            ? 'Generate or enhance the provided image based on the user\'s requirements. Maintain the same style, quality, and aspect ratio. Do not include any text or annotations in the output image. Preserve transparency and alpha channel if present in the input image. Use transparent background when appropriate.'
            : 'Generate or enhance the provided image based on the user\'s requirements. Maintain the same style, quality, and aspect ratio. Do not include any text or annotations in the output image. Use a clean background.';

        const finalPrompt = prompt || defaultPrompt;
        const normalizedImageBase64 = normalizeImagePayload(imageBase64);

        const multimodalContent = {
            parts: [
                {
                    inlineData: {
                        mimeType: mimeType || 'image/png',
                        data: normalizedImageBase64,
                    },
                },
                { text: finalPrompt },
            ],
        };

        const response = await ai.models.generateContent({
            model: modelName,
            contents: multimodalContent,
        });

        const candidates = response.candidates;

        if (!candidates || candidates.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No response generated',
            });
        }

        const parts = candidates[0]?.content?.parts || [];
        let generatedImageBase64 = null;
        let generatedMimeType = 'image/png';
        let textResponse = '';

        for (const part of parts) {
            if ('inlineData' in part && part.inlineData) {
                generatedImageBase64 = part.inlineData.data;
                generatedMimeType = part.inlineData.mimeType || 'image/png';
            } else if ('text' in part && part.text) {
                textResponse = part.text;
            }
        }

        if (!generatedImageBase64) {
            return NextResponse.json({
                success: false,
                error: 'No image was generated',
                details: textResponse || 'The model did not return an image',
            });
        }

        // Deduct credits (BYOK mode is already rejected above)
        const creditCost = getCreditCost(modelName);
        const deductResult = await deductCredits(userId, creditCost, modelName, workspaceId);
        if (!deductResult.success) {
            return NextResponse.json({
                success: false,
                error: 'Failed to deduct credits',
                details: deductResult.error,
            });
        }

        // Upload to Cloudflare if workspaceId is provided
        let cloudflareUrl: string | null = null;
        if (workspaceId) {
            try {
                const uploadResult = await uploadImageToCloudflare(
                    generatedImageBase64,
                    generatedMimeType,
                    workspaceId
                );
                cloudflareUrl = uploadResult.url;

                // Save image asset to database
                await prisma.imageAsset.create({
                    data: {
                        workspaceId,
                        userId,
                        cloudflareUrl: uploadResult.url,
                        mimeType: generatedMimeType,
                    },
                });
            } catch (error) {
                console.error('Error uploading to Cloudflare:', error);
                // Continue even if upload fails
            }
        }

        return NextResponse.json({
            success: true,
            image: generatedImageBase64,
            mimeType: generatedMimeType,
            description: textResponse,
            cloudflareUrl,
            creditsRemaining: deductResult.newBalance,
        });
    } catch (error: any) {
        console.error('Error generating image:', error);

        if (
            error?.message?.includes('API_KEY_SERVICE_BLOCKED') ||
            error?.message?.includes('403 Forbidden') ||
            error?.message?.includes('blocked')
        ) {
            return NextResponse.json({
                success: false,
                error: 'Gemini API access blocked',
                details: 'The Generative Language API is not enabled or the API key is restricted.',
            });
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to generate image',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

