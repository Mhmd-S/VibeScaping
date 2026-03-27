import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth } from '@/app/utils/auth';
import { hasActiveSubscription } from '@/app/utils/subscription';
import { TOP_UP_PRODUCTS, getTopUpProduct } from '@/app/utils/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        // Only subscribed users can top up
        const hasSubscription = await hasActiveSubscription(userId);
        if (!hasSubscription) {
            return NextResponse.json(
                {
                    error: 'Active subscription required',
                    details: 'Only subscribed users can purchase credit top-ups. Please subscribe first.',
                },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { productId } = body;

        if (!productId) {
            return NextResponse.json(
                { error: 'Product ID is required' },
                { status: 400 }
            );
        }

        const product = getTopUpProduct(productId);
        if (!product) {
            return NextResponse.json(
                { error: 'Invalid product' },
                { status: 400 }
            );
        }

        // Get or create Stripe customer
        const { prisma } = await import('@/lib/prisma');
        const subscription = await prisma.subscription.findUnique({
            where: { userId },
        });

        if (!subscription?.stripeCustomerId) {
            return NextResponse.json(
                { error: 'No Stripe customer found' },
                { status: 404 }
            );
        }

        // Create checkout session for one-time payment
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: subscription.stripeCustomerId,
            mode: 'payment', // One-time payment, not subscription
            payment_method_types: ['card'],
            line_items: [
                {
                    price: product.priceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXTAUTH_URL}/settings/topup?success=true&credits=${product.credits}`,
            cancel_url: `${process.env.NEXTAUTH_URL}/settings/topup?canceled=true`,
            metadata: {
                userId,
                productId,
                credits: product.credits.toString(),
                type: 'topup',
            },
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error('Stripe top-up checkout error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}

