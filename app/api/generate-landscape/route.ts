import { GoogleGenAI } from '@google/genai';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';

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

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            imageBase64,
            mimeType,
            isRevision,
            revisionNotes,
            referenceOriginalImageBase64,
            referenceOriginalMimeType,
        } = await request.json();

        if (!imageBase64) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Google AI API key not configured' },
                { status: 500 },
            );
        }

        const ai = new GoogleGenAI({
            apiKey,
        });

        // Build prompt based on whether this is a revision or initial generation
        let prompt: string;

        if (isRevision && revisionNotes && revisionNotes.length > 0) {
            prompt = `The user has marked areas with annotations in red indicating what changes they want. Please revise the landscape map according to these requested changes:

            Generate a new version of this landscape architecture map incorporating all the requested changes. 
            
            Maintain the same overall style and quality, align with the included reference landscape style images, and apply the specific modifications indicated. Do not include any text and annotations in the output image.      

            Do not rotate, scale, or distort the image.`;
        } else {
            // Initial generation prompt
            prompt = `You are a landscape architect. 

        Create a professional landscape architecture style map that is a faithful replica of the provided image. 
        
        Use the attached reference landscape style images to guide the aesthetic, materials, and layout quality. Do not include any text, annotations in the output image or new features.
        
          Maintain rotation, scale, and aspect ratio of the image. Use a white background.`;
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
        console.error('Error generating landscape image:', error);

        // Check for specific API key errors
        if (
            error?.message?.includes('API_KEY_SERVICE_BLOCKED') ||
            error?.message?.includes('403 Forbidden') ||
            error?.message?.includes('blocked')
        ) {
            return NextResponse.json(
                {
                    error: 'Google AI API access blocked',
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
                error: 'Failed to generate landscape image',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}
