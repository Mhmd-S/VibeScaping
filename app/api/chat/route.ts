import { GoogleGenAI } from '@google/genai';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';

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

        const { message, history = [] } = await request.json();

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 },
            );
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

        // Build conversation history
        const conversationHistory = history.map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        // Add current message
        const currentMessage = {
            role: 'user' as const,
            parts: [{ text: message }],
        };

        // Try gemini-pro model first, fallback to other models
        let response;
        let modelName = 'gemini-2.0-flash-exp';

        try {
            response = await ai.models.generateContent({
                model: modelName,
                contents: [...conversationHistory, currentMessage],
            });
        } catch (expError: any) {
            console.warn('Flash model failed, trying stable model:', expError.message);
            modelName = 'gemini-1.5-pro';

            try {
                response = await ai.models.generateContent({
                    model: modelName,
                    contents: [...conversationHistory, currentMessage],
                });
            } catch (altError: any) {
                console.error('All models failed:', altError.message);
                throw altError;
            }
        }

        const candidates = response.candidates;

        if (!candidates || candidates.length === 0) {
            return NextResponse.json(
                { error: 'No response generated' },
                { status: 500 },
            );
        }

        // Extract text response
        const parts = candidates[0]?.content?.parts || [];
        let textResponse = '';

        for (const part of parts) {
            if ('text' in part && part.text) {
                textResponse += part.text;
            }
        }

        if (!textResponse) {
            return NextResponse.json(
                {
                    error: 'No text response generated',
                    details: 'The model did not return a text response',
                },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            message: textResponse,
            model: modelName,
        });
    } catch (error: any) {
        console.error('Error in chat API:', error);

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
                error: 'Failed to process chat message',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}

