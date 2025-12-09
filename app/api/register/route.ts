import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

const registerSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(100),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid form data', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const normalizedEmail = parsed.data.email.toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'An account with that email already exists' },
                { status: 409 },
        );
        }

        const hashedPassword = await hash(parsed.data.password, 12);

        await prisma.user.create({
            data: {
                name: parsed.data.name,
                email: normalizedEmail,
                password: hashedPassword,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Unable to create account. Please try again.' },
            { status: 500 },
        );
    }
}

