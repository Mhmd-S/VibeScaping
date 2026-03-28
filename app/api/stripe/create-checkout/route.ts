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

        // Get or create Stripe customer
        const { prisma } = await import('@/lib/prisma');
        const subscription = await prisma.subscription.findUnique({
            where: { userId },
        });

        let customerId: string;
        if (subscription?.stripeCustomerId) {
            customerId = subscription.stripeCustomerId;
        } else {
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            const customer = await getStripe().customers.create({
                email: user?.email || undefined,
                metadata: {
                    userId,
                },
            });

            customerId = customer.id;

            // Create or update subscription record
            await prisma.subscription.upsert({
                where: { userId },
                create: {
                    userId,
                    stripeCustomerId: customerId,
                    status: 'incomplete',
                    plan: planId,
                },
                update: {
                    stripeCustomerId: customerId,
                    status: 'incomplete',
                    plan: planId,
                },
            });
        }

        // Create checkout session
        const checkoutSession = await getStripe().checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: PLAN_PRICE_IDS[planId],
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

