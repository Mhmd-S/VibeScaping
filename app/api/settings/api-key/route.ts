import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const apiKeySchema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
});

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { apiKey: true },
        });

        // Return masked API key if exists
        if (user?.apiKey) {
            const decrypted = decrypt(user.apiKey);
            // Mask the key: show first 8 and last 4 characters
            const masked = decrypted.length > 12
                ? `${decrypted.substring(0, 8)}${'*'.repeat(decrypted.length - 12)}${decrypted.substring(decrypted.length - 4)}`
                : '***';
            return NextResponse.json({ apiKey: masked, hasKey: true });
        }

        return NextResponse.json({ apiKey: null, hasKey: false });
    } catch (error) {
        console.error('Failed to get API key:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve API key' },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const parsed = apiKeySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid API key', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        // Encrypt the API key before storing
        const encryptedApiKey = encrypt(parsed.data.apiKey);

        await prisma.user.update({
            where: { id: session.user.id },
            data: { apiKey: encryptedApiKey },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save API key:', error);
        return NextResponse.json(
            { error: 'Failed to save API key' },
            { status: 500 },
        );
    }
}

export async function DELETE() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { apiKey: null },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete API key:', error);
        return NextResponse.json(
            { error: 'Failed to delete API key' },
            { status: 500 },
        );
    }
}

