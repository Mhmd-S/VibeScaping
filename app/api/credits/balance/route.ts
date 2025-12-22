import { NextResponse } from 'next/server';
import { requireAuth } from '@/app/utils/auth';
import { getCreditBalance } from '@/app/utils/credits';

export async function GET() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const balance = await getCreditBalance(userId);

        return NextResponse.json({ balance });
    } catch (error) {
        console.error('Error fetching credit balance:', error);
        return NextResponse.json(
            { error: 'Failed to fetch credit balance' },
            { status: 500 }
        );
    }
}

