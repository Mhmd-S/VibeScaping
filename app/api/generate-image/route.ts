import { GoogleGenAI } from '@google/genai';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';

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
            isRevision,
            revisionNotes,
            referenceOriginalImageBase64,
            referenceOriginalMimeType,
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

        // Build generic prompt
        let prompt: string;

        if (userPrompt) {
            // Use user-provided prompt
            prompt = userPrompt;
        } else if (isRevision && revisionNotes && revisionNotes.length > 0) {
            // Generic revision prompt
            prompt = `The user has marked areas with annotations indicating what changes they want. Please revise the image according to these requested changes:

${revisionNotes.map((note: string) => `- ${note}`).join('\n')}

Generate a new version of this image incorporating all the requested changes. Focus closely on the areas indicated by the annotations. Maintain the same overall style and quality, and apply the specific modifications indicated. Do not include any text or annotations in the output image. Do not rotate, scale, or distort the image.`;
        } else {
            // Generic initial generation prompt
            prompt = `Generate or enhance the provided image based on the user's requirements. Maintain the same style, quality, and aspect ratio. Do not include any text or annotations in the output image. Use a clean background.`;
        }

        // Normalize incoming images so the model always receives base64 bytes
        const normalizedUserImageBase64 = await normalizeImagePayload(imageBase64);
        const normalizedReferenceBase64 = referenceOriginalImageBase64
            ? await normalizeImagePayload(referenceOriginalImageBase64)
            : null;

        // Try image generation model first, fallback to other models if needed
        let response;
        let modelName = 'gemini-3-pro-image-preview';

        // Construct multimodal content with reference images, user image, and prompt
        const multimodalContent = {
            parts: [
                ...(normalizedReferenceBase64
                    ? [
                          {
                              inlineData: {
                                  mimeType: referenceOriginalMimeType || 'image/png',
                                  data: normalizedReferenceBase64,
                              },
                          },
                      ]
                    : []),
                {
                    inlineData: {
                        mimeType: mimeType || 'image/png',
                        data: normalizedUserImageBase64,
                    },
                },
                { text: prompt },
            ],
        };

        try {
            // Try image generation model with image input and text prompt
            response = await ai.models.generateContent({
                model: modelName,
                contents: multimodalContent,
            });
        } catch (expError: any) {
            // If image generation model fails, try other models
            console.warn(
                'Image generation model failed, trying alternative model:',
                expError.message,
            );
            modelName = 'gemini-2.0-flash-exp';

            try {
                response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash-exp',
                    contents: multimodalContent,
                });
            } catch (altError: any) {
                // Final fallback to stable model
                console.warn(
                    'Alternative model failed, trying stable model:',
                    altError.message,
                );
                modelName = 'gemini-1.5-pro';

                response = await ai.models.generateContent({
                    model: 'gemini-1.5-pro',
                    contents: multimodalContent,
                });
            }
        }

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

