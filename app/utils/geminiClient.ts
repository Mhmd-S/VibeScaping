'use client';

import type { GeminiImageModel } from '@/components/ai-01';

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

const ANNOTATION_PROMPT = `The image contains annotations (arrows, text labels, shapes, freehand drawings, and other markings) that indicate desired changes to the underlying landscape/scene.

Instructions:
1. Interpret each annotation as a directive for modification (e.g., an arrow pointing to an area with text "add tree" means add a tree there)
2. Apply all annotated changes to the underlying image as realistic modifications
3. Remove ALL annotations (arrows, text, shapes, drawings, markers) from the final output
4. Maintain the photorealistic quality and style of the original image
5. Preserve the original image's resolution, lighting, and perspective
6. Only modify areas indicated by annotations; leave unannotated areas unchanged`;

export const buildAnnotationPrompt = (userPrompt?: string): string => {
    if (userPrompt?.trim()) {
        return `${ANNOTATION_PROMPT}\n\nAdditional instructions from the user: ${userPrompt.trim()}`;
    }
    return ANNOTATION_PROMPT;
};

export const generateImage = async (
    request: GenerateImageRequest,
    userId?: string | null,
    workspaceId?: string
): Promise<GenerateImageResponse> => {
    if (!userId) {
        return {
            success: false,
            image: '',
            mimeType: 'image/png',
            error: 'Authentication required',
            details: 'Please sign in to generate images.',
        };
    }

    try {
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
        console.error('Error generating image:', error);
        return {
            success: false,
            image: '',
            mimeType: 'image/png',
            error: 'Failed to generate image',
            details: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};
