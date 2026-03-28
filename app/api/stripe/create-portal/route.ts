import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/utils/auth';
import Stripe from 'stripe';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const { supabase } = await import('@/lib/supabase');
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select()
            .eq('user_id', userId)
            .single();

        if (!subscription?.stripe_customer_id) {
            return NextResponse.json(
                { error: 'No subscription found' },
                { status: 404 }
            );
        }

        const portalSession = await getStripe().billingPortal.sessions.create({
            customer: subscription.stripe_customer_id,
            return_url: `${process.env.NEXTAUTH_URL}/settings/subscription`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error('Stripe portal error:', error);
        return NextResponse.json(
            { error: 'Failed to create portal session' },
            { status: 500 }
        );
    }
}
