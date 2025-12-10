import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { uploadBase64Image } from '@/lib/cloudflare';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const designPayloadSchema = z.object({
    generatedImageBase64: z.string().min(1),
    generatedMimeType: z.string().default('image/png'),
    originalImageBase64: z.string().optional(),
    originalMimeType: z.string().optional(),
    description: z.string().optional(),
    revisionHistory: z.any().optional(),
});

const serializeDesign = (design: any) => ({
    ...design,
    createdAt: design.createdAt.toISOString(),
    updatedAt: design.updatedAt.toISOString(),
});

export const GET = async (
    _request: NextRequest,
    { params }: { params: { projectId: string } },
) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
        where: { id: params.projectId, ownerId: session.user.id },
    });

    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const designs = await prisma.design.findMany({
        where: { projectId: params.projectId },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
        designs: designs.map(serializeDesign),
    });
};

export const POST = async (
    request: NextRequest,
    { params }: { params: { projectId: string } },
) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
        where: { id: params.projectId, ownerId: session.user.id },
    });

    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    try {
        const body = await request.json();
        const parsed = designPayloadSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid design payload', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const generatedImageUrl = await uploadBase64Image({
            base64: parsed.data.generatedImageBase64,
            mimeType: parsed.data.generatedMimeType,
            keyPrefix: `projects/${project.id}/generated`,
        });

        const originalImageUrl = parsed.data.originalImageBase64
            ? await uploadBase64Image({
                  base64: parsed.data.originalImageBase64,
                  mimeType: parsed.data.originalMimeType || parsed.data.generatedMimeType,
                  keyPrefix: `projects/${project.id}/originals`,
              })
            : null;

        const design = await prisma.design.create({
            data: {
                projectId: project.id,
                generatedImageUrl,
                originalImageUrl,
                mimeType: parsed.data.generatedMimeType,
                description: parsed.data.description,
                revisionHistory: parsed.data.revisionHistory ?? null,
            },
        });

        return NextResponse.json(
            {
                design: serializeDesign(design),
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('Failed to save design', error);
        return NextResponse.json(
            { error: 'Unable to persist design right now' },
            { status: 500 },
        );
    }
};



