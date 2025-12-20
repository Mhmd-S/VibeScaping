import { GoogleGenAI } from '@google/genai';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';
import type { GeminiImageModel } from '@/components/ai-01';

const normalizeImagePayload = async (value: string): Promise<string> => {
    if (!value) return '';

    // If already data URL, strip prefix and return base64 part
    if (value.startsWith('data:')) {
        const [, base64Part] = value.split(',', 2);
        return base64Part || '';
    }

    // If it looks like an http(s) URL, fetch and convert to base64
    if (value.startsWith('http://') || value.startsWith('https://')) {
        const response = await fetch(value);
        if (!response.ok) {
            throw new Error(`Failed to fetch source image (${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    }

    // Assume raw base64 string
    return value;
};

const getUserApiKey = async (userId: string): Promise<string | null> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { apiKey: true },
        });

        if (user?.apiKey) {
            return decrypt(user.apiKey);
        }
    } catch (error) {
        console.error('Failed to get user API key:', error);
    }
    return null;
};

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            imageBase64,
            mimeType,
            prompt: userPrompt,
            model: userModel,
        } = await request.json();

        if (!imageBase64) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Get API key from user's stored key or fallback to env
        let apiKey = await getUserApiKey(session.user.id);
        if (!apiKey) {
            apiKey = process.env.GOOGLE_AI_API_KEY || null;
        }

        if (!apiKey) {
            return NextResponse.json(
                {
                    error: 'API key not configured',
                    details: 'Please provide your Gemini API key in settings or configure GOOGLE_AI_API_KEY environment variable',
                },
                { status: 500 },
            );
        }

        const ai = new GoogleGenAI({
            apiKey,
        });

        // Use user-provided prompt or default generic prompt
        const prompt = userPrompt || 'Generate or enhance the provided image based on the user\'s requirements. Maintain the same style, quality, and aspect ratio. Do not include any text or annotations in the output image. Use a clean background.';

        // Normalize incoming image so the model always receives base64 bytes
        const normalizedUserImageBase64 = await normalizeImagePayload(imageBase64);

        // Use selected model or default to gemini-3-pro-image-preview
        const modelName: GeminiImageModel = userModel || 'gemini-3-pro-image-preview';

        // Construct multimodal content with user image and prompt
        const multimodalContent = {
            parts: [
                {
                    inlineData: {
                        mimeType: mimeType || 'image/png',
                        data: normalizedUserImageBase64,
                    },
                },
                { text: prompt },
            ],
        };

        // Generate content with the image generation model
        const response = await ai.models.generateContent({
            model: modelName,
            contents: multimodalContent,
        });

        const candidates = response.candidates;

        if (!candidates || candidates.length === 0) {
            return NextResponse.json(
                { error: 'No response generated' },
                { status: 500 },
            );
        }

        // Extract the generated image from the response
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
            // If no image was generated, return the text response as an error
            return NextResponse.json(
                {
                    error: 'No image was generated',
                    details: textResponse || 'The model did not return an image',
                },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            image: generatedImageBase64,
            mimeType: generatedMimeType,
            description: textResponse,
        });
    } catch (error: any) {
        console.error('Error generating image:', error);

        // Check for specific API key errors
        if (
            error?.message?.includes('API_KEY_SERVICE_BLOCKED') ||
            error?.message?.includes('403 Forbidden') ||
            error?.message?.includes('blocked')
        ) {
            return NextResponse.json(
                {
                    error: 'Gemini API access blocked',
                    details:
                        'The Generative Language API is not enabled or your API key is restricted. Please:\n' +
                        '1. Go to Google Cloud Console (https://console.cloud.google.com/)\n' +
                        '2. Enable the "Generative Language API" for your project\n' +
                        '3. Check that your API key has the correct permissions\n' +
                        '4. Ensure billing is enabled if required\n' +
                        '5. Verify API key restrictions allow access to Generative Language API',
                    apiError: error.message,
                },
                { status: 403 },
            );
        }

        return NextResponse.json(
            {
                error: 'Failed to generate image',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}

