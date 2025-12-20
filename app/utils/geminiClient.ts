'use client';

import { GoogleGenAI } from '@google/genai';
import { getApiKey } from './apiKey';

const normalizeImagePayload = (value: string): string => {
    if (!value) return '';

    // If already data URL, strip prefix and return base64 part
    if (value.startsWith('data:')) {
        const [, base64Part] = value.split(',', 2);
        return base64Part || '';
    }

    // Assume raw base64 string
    return value;
};

export interface GenerateImageRequest {
    imageBase64: string;
    mimeType: string;
    prompt: string;
}

export interface GenerateImageResponse {
    success: boolean;
    image: string;
    mimeType: string;
    description?: string;
    error?: string;
    details?: string;
}

export const generateImage = async (
    request: GenerateImageRequest
): Promise<GenerateImageResponse> => {
    const apiKey = getApiKey();

    if (!apiKey) {
        return {
            success: false,
            image: '',
            mimeType: 'image/png',
            error: 'API key not configured',
            details: 'Please provide your Gemini API key in settings',
        };
    }

    try {
        const ai = new GoogleGenAI({
            apiKey,
        });

        // Use user-provided prompt or default generic prompt
        const prompt = request.prompt || 'Generate or enhance the provided image based on the user\'s requirements. Maintain the same style, quality, and aspect ratio. Do not include any text or annotations in the output image. Use a clean background.';

        // Normalize incoming image so the model always receives base64 bytes
        const normalizedUserImageBase64 = normalizeImagePayload(request.imageBase64);

        // Use a single model for image generation
        const modelName = 'gemini-3-pro-image-preview';

        // Construct multimodal content with user image and prompt
        const multimodalContent = {
            parts: [
                {
                    inlineData: {
                        mimeType: request.mimeType || 'image/png',
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
            return {
                success: false,
                image: '',
                mimeType: 'image/png',
                error: 'No response generated',
            };
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
            return {
                success: false,
                image: '',
                mimeType: 'image/png',
                error: 'No image was generated',
                details: textResponse || 'The model did not return an image',
            };
        }

        return {
            success: true,
            image: generatedImageBase64,
            mimeType: generatedMimeType,
            description: textResponse,
        };
    } catch (error: any) {
        console.error('Error generating image:', error);

        // Check for specific API key errors
        if (
            error?.message?.includes('API_KEY_SERVICE_BLOCKED') ||
            error?.message?.includes('403 Forbidden') ||
            error?.message?.includes('blocked')
        ) {
            return {
                success: false,
                image: '',
                mimeType: 'image/png',
                error: 'Gemini API access blocked',
                details:
                    'The Generative Language API is not enabled or your API key is restricted. Please:\n' +
                    '1. Go to Google Cloud Console (https://console.cloud.google.com/)\n' +
                    '2. Enable the "Generative Language API" for your project\n' +
                    '3. Check that your API key has the correct permissions\n' +
                    '4. Ensure billing is enabled if required\n' +
                    '5. Verify API key restrictions allow access to Generative Language API',
            };
        }

        return {
            success: false,
            image: '',
            mimeType: 'image/png',
            error: 'Failed to generate image',
            details: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

