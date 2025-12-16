import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { uploadBase64Image } from '@/lib/cloudflare';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const annotatedImagePayloadSchema = z.object({
    generatedImageBase64: z.string().min(1),
    generatedMimeType: z.string().default('image/png'),
    originalImageBase64: z.string().optional(),
    originalMimeType: z.string().optional(),
    description: z.string().optional(),
    revisionHistory: z.any().optional(),
});

const serializeAnnotatedImage = (annotatedImage: any) => ({
    ...annotatedImage,
    createdAt: annotatedImage.createdAt.toISOString(),
    updatedAt: annotatedImage.updatedAt.toISOString(),
});

export const GET = async (
    _request: NextRequest,
    context: { params: Promise<{ workspaceId: string }> },
) => {
    const { workspaceId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId, ownerId: session.user.id },
    });

    if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const annotatedImages = await prisma.annotatedImage.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
        annotatedImages: annotatedImages.map(serializeAnnotatedImage),
    });
};

export const POST = async (
    request: NextRequest,
    context: { params: Promise<{ workspaceId: string }> },
) => {
    const { workspaceId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId, ownerId: session.user.id },
    });

    if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    try {
        const body = await request.json();
        const parsed = annotatedImagePayloadSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid annotated image payload', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const generatedImageUrl = await uploadBase64Image({
            base64: parsed.data.generatedImageBase64,
            mimeType: parsed.data.generatedMimeType,
            keyPrefix: `workspaces/${workspace.id}/generated`,
        });

        const originalImageUrl = parsed.data.originalImageBase64
            ? await uploadBase64Image({
                  base64: parsed.data.originalImageBase64,
                  mimeType: parsed.data.originalMimeType || parsed.data.generatedMimeType,
                  keyPrefix: `workspaces/${workspace.id}/originals`,
              })
            : null;

        const annotatedImage = await prisma.annotatedImage.create({
            data: {
                workspaceId: workspace.id,
                generatedImageUrl,
                originalImageUrl,
                mimeType: parsed.data.generatedMimeType,
                description: parsed.data.description,
                revisionHistory: parsed.data.revisionHistory ?? null,
            },
        });

        return NextResponse.json(
            {
                annotatedImage: serializeAnnotatedImage(annotatedImage),
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('Failed to save annotated image', error);
        return NextResponse.json(
            { error: 'Unable to persist annotated image right now' },
            { status: 500 },
        );
    }
};

