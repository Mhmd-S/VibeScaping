import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const createProjectSchema = z.object({
    name: z.string().min(2).max(120),
    description: z.string().max(500).optional(),
});

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
        where: { ownerId: session.user.id },
        orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
        projects: projects.map((project) => ({
            ...project,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
            lastOpenedAt: project.lastOpenedAt?.toISOString() ?? null,
        })),
    });
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const parsed = createProjectSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid project data', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const project = await prisma.project.create({
            data: {
                name: parsed.data.name,
                description: parsed.data.description ?? '',
                ownerId: session.user.id,
            },
        });

        return NextResponse.json(
            {
                project: {
                    ...project,
                    createdAt: project.createdAt.toISOString(),
                    updatedAt: project.updatedAt.toISOString(),
                    lastOpenedAt: project.lastOpenedAt?.toISOString() ?? null,
                },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('Project creation failed:', error);
        return NextResponse.json(
            { error: 'Unable to create project right now' },
            { status: 500 },
        );
    }
}

