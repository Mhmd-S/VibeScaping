import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth } from '@/app/utils/auth';
import { SUBSCRIPTION_PLANS, PLAN_PRICE_IDS } from '@/app/utils/subscription';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const body = await request.json();
        const { planId } = body;

        if (!planId) {
            return NextResponse.json(
                { error: 'Plan ID is required' },
                { status: 400 }
            );
        }

        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
        if (!plan) {
            return NextResponse.json(
                { error: 'Invalid plan' },
                { status: 400 }
            );
        }

        const priceId = PLAN_PRICE_IDS[planId];
        if (!priceId) {
            return NextResponse.json(
                { error: 'Price not configured for this plan' },
                { status: 500 }
            );
        }

        // Get or create Stripe customer
        const { supabase } = await import('@/lib/supabase');
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select()
            .eq('user_id', userId)
            .single();

        let customerId: string;
        if (subscription?.stripe_customer_id) {
            customerId = subscription.stripe_customer_id;
        } else {
            const { data: user } = await supabase
                .from('users')
                .select('email')
                .eq('id', userId)
                .single();

            const customer = await getStripe().customers.create({
                email: user?.email || undefined,
                metadata: {
                    userId,
                },
            });

            customerId = customer.id;

            // Create or update subscription record
            if (subscription) {
                await supabase
                    .from('subscriptions')
                    .update({
                        stripe_customer_id: customerId,
                        status: 'incomplete',
                        plan: planId,
                    })
                    .eq('user_id', userId);
            } else {
                await supabase.from('subscriptions').insert({
                    user_id: userId,
                    stripe_customer_id: customerId,
                    status: 'incomplete',
                    plan: planId,
                });
            }
        }

        // Create checkout session
        const checkoutSession = await getStripe().checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXTAUTH_URL}/settings/subscription?success=true`,
            cancel_url: `${process.env.NEXTAUTH_URL}/settings/subscription?canceled=true`,
            metadata: {
                userId,
                planId,
            },
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
