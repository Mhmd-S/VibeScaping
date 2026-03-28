import { NextResponse } from 'next/server';
import { requireAuth } from '@/app/utils/auth';
import { getCreditBalance, getFreeGenerationsRemaining, FREE_MONTHLY_GENERATIONS } from '@/app/utils/credits';

export async function GET() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const [balance, freeRemaining] = await Promise.all([
            getCreditBalance(userId),
            getFreeGenerationsRemaining(userId),
        ]);

        return NextResponse.json({
            balance,
            freeGenerationsRemaining: freeRemaining,
            freeGenerationsTotal: FREE_MONTHLY_GENERATIONS,
        });
    } catch (error) {
        console.error('Error fetching credit balance:', error);
        return NextResponse.json(
            { error: 'Failed to fetch credit balance' },
            { status: 500 }
        );
    }
}
