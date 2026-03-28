import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth } from '@/app/utils/auth';
import { getTopUpProduct, TOPUP_PRICE_IDS } from '@/app/utils/subscription';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

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

        const priceId = TOPUP_PRICE_IDS[productId];
        if (!priceId) {
            return NextResponse.json(
                { error: 'Price not configured for this product' },
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
                metadata: { userId },
            });

            customerId = customer.id;

            if (subscription) {
                await supabase
                    .from('subscriptions')
                    .update({ stripe_customer_id: customerId })
                    .eq('user_id', userId);
            } else {
                await supabase.from('subscriptions').insert({
                    user_id: userId,
                    stripe_customer_id: customerId,
                    status: 'incomplete',
                    plan: 'free',
                });
            }
        }

        // Create checkout session for one-time payment
        const checkoutSession = await getStripe().checkout.sessions.create({
            customer: customerId,
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
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
