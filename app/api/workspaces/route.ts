import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const createWorkspaceSchema = z.object({
    name: z.string().min(2).max(120),
    description: z.string().max(500).optional(),
});

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaces = await prisma.workspace.findMany({
        where: { ownerId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        include: {
            annotatedImages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                    id: true,
                    generatedImageUrl: true,
                    originalImageUrl: true,
                    mimeType: true,
                    description: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
        },
    });

    return NextResponse.json({
        workspaces: workspaces.map((workspace) => {
            const { annotatedImages, ...workspaceData } = workspace;
            const [latestAnnotatedImage] = annotatedImages;

            return {
                ...workspaceData,
                createdAt: workspace.createdAt.toISOString(),
                updatedAt: workspace.updatedAt.toISOString(),
                lastOpenedAt: workspace.lastOpenedAt?.toISOString() ?? null,
                lastAnnotatedImage: latestAnnotatedImage
                    ? {
                          ...latestAnnotatedImage,
                          createdAt: latestAnnotatedImage.createdAt.toISOString(),
                          updatedAt: latestAnnotatedImage.updatedAt.toISOString(),
                      }
                    : null,
            };
        }),
    });
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const parsed = createWorkspaceSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid workspace data', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const workspace = await prisma.workspace.create({
            data: {
                name: parsed.data.name,
                description: parsed.data.description ?? '',
                ownerId: session.user.id,
            },
        });

        return NextResponse.json(
            {
                workspace: {
                    ...workspace,
                    createdAt: workspace.createdAt.toISOString(),
                    updatedAt: workspace.updatedAt.toISOString(),
                    lastOpenedAt: workspace.lastOpenedAt?.toISOString() ?? null,
                },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('Workspace creation failed:', error);
        return NextResponse.json(
            { error: 'Unable to create workspace right now' },
            { status: 500 },
        );
    }
}

