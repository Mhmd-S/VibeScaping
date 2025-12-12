import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const updateProjectSchema = z
    .object({
        name: z.string().min(2).max(120).optional(),
        description: z.string().max(500).nullable().optional(),
    })
    .refine((data) => data.name !== undefined || data.description !== undefined, {
        message: 'No updates provided',
    });

const serializeProject = (project: any) => {
    const { designs, ...projectData } = project;
    const [latestDesign] = designs ?? [];

    return {
        ...projectData,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        lastOpenedAt: project.lastOpenedAt?.toISOString() ?? null,
        lastDesign: latestDesign
            ? {
                  ...latestDesign,
                  createdAt: latestDesign.createdAt.toISOString(),
                  updatedAt: latestDesign.updatedAt.toISOString(),
              }
            : null,
    };
};

export const PATCH = async (
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> },
) => {
    const { projectId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: session.user.id },
    });

    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    try {
        const body = await request.json();
        const parsed = updateProjectSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid project data', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const updatedProject = await prisma.project.update({
            where: { id: project.id },
            data: {
                ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
                ...(parsed.data.description !== undefined ? { description: parsed.data.description ?? '' } : {}),
            },
            include: {
                designs: {
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

        return NextResponse.json({ project: serializeProject(updatedProject) });
    } catch (error) {
        console.error('Project update failed:', error);
        return NextResponse.json(
            { error: 'Unable to update project right now' },
            { status: 500 },
        );
    }
};

export const DELETE = async (
    _request: NextRequest,
    context: { params: Promise<{ projectId: string }> },
) => {
    const { projectId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: session.user.id },
    });

    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    try {
        await prisma.design.deleteMany({ where: { projectId: project.id } });
        await prisma.project.delete({ where: { id: project.id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Project deletion failed:', error);
        return NextResponse.json(
            { error: 'Unable to delete project right now' },
            { status: 500 },
        );
    }
};


