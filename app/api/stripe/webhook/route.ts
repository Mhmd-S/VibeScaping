import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { grantCredits } from '@/app/utils/credits';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Check if a Stripe event has already been processed (idempotency).
 * Returns true if already processed, false if new.
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase
        .from('credit_transactions')
        .select('id')
        .like('reason', `%${eventId}%`)
        .limit(1);

    return !!data && data.length > 0;
}


export async function POST(request: NextRequest) {
    console.log('[webhook] Stripe webhook received');
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json(
            { error: 'No signature' },
            { status: 400 }
        );
    }

    let event: Stripe.Event;

    try {
        event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json(
            { error: `Webhook Error: ${err.message}` },
            { status: 400 }
        );
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.userId;
                const paymentType = session.metadata?.type;

                if (!userId) {
                    console.error('No userId in metadata');
                    break;
                }

                // Handle top-up payments (one-time payments)
                if (paymentType === 'topup') {
                    // Idempotency: skip if this event was already processed
                    if (await isEventProcessed(event.id)) {
                        console.log(`Skipping duplicate event: ${event.id}`);
                        break;
                    }

                    const credits = parseInt(session.metadata?.credits || '0', 10);
                    if (credits > 0) {
                        const result = await grantCredits(
                            userId,
                            credits,
                            `Top-up purchase: ${session.metadata?.productId || 'unknown'} [${event.id}]`
                        );
                        console.log(`Granted ${credits} credits to user ${userId}, new balance: ${result.newBalance}`);
                    }
                }

                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        );
    }
}
