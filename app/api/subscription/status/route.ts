import { NextResponse } from 'next/server';
import { requireAuth } from '@/app/utils/auth';
import { getSubscription } from '@/app/utils/subscription';

export async function GET() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const subscription = await getSubscription(userId);

        if (!subscription) {
            return NextResponse.json({
                status: 'none',
                plan: null,
                currentPeriodEnd: null,
            });
        }

        return NextResponse.json({
            status: subscription.status,
            plan: subscription.plan,
            currentPeriodEnd: subscription.current_period_end || null,
        });
    } catch (error) {
        console.error('Error fetching subscription status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscription status' },
            { status: 500 }
        );
    }
}

