'use client';

import { GoogleGenAI } from '@google/genai';
import { getApiKey, isUsingBYOK } from './apiKey';
import type { GeminiImageModel } from '@/components/ai-01';

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

/**
 * Checks if the mimeType supports transparency (alpha channel)
 */
const supportsTransparency = (mimeType: string): boolean => {
    return mimeType === 'image/png' || mimeType === 'image/webp';
};

export interface GenerateImageRequest {
    imageBase64: string;
    mimeType: string;
    prompt: string;
    model?: GeminiImageModel;
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
    request: GenerateImageRequest,
    userId?: string | null,
    workspaceId?: string
): Promise<GenerateImageResponse> => {
    const usingBYOK = isUsingBYOK();
    const apiKey = getApiKey();

    // If using BYOK, use client-side generation with user's API key
    // For authenticated users with BYOK, server validation happens in generateImageWithSubscription
    // but since BYOK allows all models, we can use client-side directly
    if (usingBYOK && apiKey) {
        // For authenticated users, we could validate with server, but since BYOK allows all models
        // for all tiers, we can proceed directly with client-side generation
        return generateImageWithBYOK(request, apiKey);
    }

    // If not BYOK, check if user is authenticated
    if (!userId) {
        return {
            success: false,
            image: '',
            mimeType: 'image/png',
            error: 'Authentication required',
            details: 'Please sign in or provide your own API key in settings',
        };
    }

    // Use server-side generation with credit checking and model restrictions
    return generateImageWithSubscription(request, userId, workspaceId);
};

const generateImageWithBYOK = async (
    request: GenerateImageRequest,
    apiKey: string
): Promise<GenerateImageResponse> => {

    try {
        const ai = new GoogleGenAI({
            apiKey,
        });

        // Check if input image supports transparency
        const inputSupportsTransparency = supportsTransparency(request.mimeType || 'image/png');
        
        // Use user-provided prompt or default generic prompt
        // If input supports transparency, preserve it; otherwise use clean background
        const defaultPrompt = inputSupportsTransparency
            ? 'Generate or enhance the provided image based on the user\'s requirements. Maintain the same style, quality, and aspect ratio. Do not include any text or annotations in the output image. Preserve transparency and alpha channel if present in the input image. Use transparent background when appropriate.'
            : 'Generate or enhance the provided image based on the user\'s requirements. Maintain the same style, quality, and aspect ratio. Do not include any text or annotations in the output image. Use a clean background.';
        
        const prompt = request.prompt || defaultPrompt;

        // Normalize incoming image so the model always receives base64 bytes
        const normalizedUserImageBase64 = normalizeImagePayload(request.imageBase64);

        // Use selected model or default to gemini-3-pro-image-preview
        const modelName = request.model || 'gemini-3-pro-image-preview';

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

        // If input had transparency but output format doesn't support it, log a warning
        // Note: We can't force the API to return PNG, but we can detect the mismatch
        if (inputSupportsTransparency && !supportsTransparency(generatedMimeType)) {
            console.warn(
                `Input image (${request.mimeType}) supports transparency, but output format (${generatedMimeType}) does not. Transparency may be lost.`
            );
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

const generateImageWithSubscription = async (
    request: GenerateImageRequest,
    userId: string,
    workspaceId?: string
): Promise<GenerateImageResponse> => {
    try {
        // Check if user has BYOK enabled (even if authenticated)
        const usingBYOK = isUsingBYOK();
        
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageBase64: request.imageBase64,
                mimeType: request.mimeType,
                prompt: request.prompt,
                model: request.model,
                workspaceId,
                isBYOK: usingBYOK, // Send BYOK flag to server
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                image: '',
                mimeType: 'image/png',
                error: data.error || 'Failed to generate image',
                details: data.details,
            };
        }

        return {
            success: data.success,
            image: data.image,
            mimeType: data.mimeType,
            description: data.description,
        };
    } catch (error) {
        console.error('Error generating image with subscription:', error);
        return {
            success: false,
            image: '',
            mimeType: 'image/png',
            error: 'Failed to generate image',
            details: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

