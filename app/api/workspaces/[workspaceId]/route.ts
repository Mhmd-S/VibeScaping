import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const updateWorkspaceSchema = z
    .object({
        name: z.string().min(2).max(120).optional(),
        description: z.string().max(500).nullable().optional(),
    })
    .refine((data) => data.name !== undefined || data.description !== undefined, {
        message: 'No updates provided',
    });

const serializeWorkspace = (workspace: any) => {
    const { annotatedImages, ...workspaceData } = workspace;
    const [latestAnnotatedImage] = annotatedImages ?? [];

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
};

export const PATCH = async (
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
        const parsed = updateWorkspaceSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid workspace data', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const updatedWorkspace = await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
                ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
                ...(parsed.data.description !== undefined ? { description: parsed.data.description ?? '' } : {}),
            },
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

        return NextResponse.json({ workspace: serializeWorkspace(updatedWorkspace) });
    } catch (error) {
        console.error('Workspace update failed:', error);
        return NextResponse.json(
            { error: 'Unable to update workspace right now' },
            { status: 500 },
        );
    }
};

export const DELETE = async (
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

    try {
        await prisma.annotatedImage.deleteMany({ where: { workspaceId: workspace.id } });
        await prisma.workspace.delete({ where: { id: workspace.id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Workspace deletion failed:', error);
        return NextResponse.json(
            { error: 'Unable to delete workspace right now' },
            { status: 500 },
        );
    }
};

