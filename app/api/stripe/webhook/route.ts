import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { getCreditsForPlan } from '@/app/utils/subscription';
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
    const { data } = await supabase
        .from('credit_transactions')
        .select('id')
        .like('reason', `%${eventId}%`)
        .limit(1);

    return !!data && data.length > 0;
}


export async function POST(request: NextRequest) {
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
                const subscriptionId = session.subscription as string;
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
                        await grantCredits(
                            userId,
                            credits,
                            `Top-up purchase: ${session.metadata?.productId || 'unknown'} [${event.id}]`
                        );
                    }
                    break;
                }

                // Handle subscription payments
                if (!subscriptionId) {
                    console.error('No subscription ID for subscription checkout');
                    break;
                }

                // Get subscription details from Stripe
                const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
                const planId = session.metadata?.planId || 'monthly';

                // Update subscription in database
                await supabase
                    .from('subscriptions')
                    .update({
                        stripe_subscription_id: subscriptionId,
                        status: subscription.status === 'active' ? 'active' : 'incomplete',
                        plan: planId,
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    })
                    .eq('user_id', userId);

                // Credits are granted via invoice.payment_succeeded, not here,
                // to avoid double-granting on new subscriptions.

                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                const { data: dbSubscription } = await supabase
                    .from('subscriptions')
                    .select()
                    .eq('stripe_customer_id', customerId)
                    .single();

                if (dbSubscription) {
                    await supabase
                        .from('subscriptions')
                        .update({
                            status: subscription.status,
                            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        })
                        .eq('id', dbSubscription.id);
                }

                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                const { data: dbSubscription } = await supabase
                    .from('subscriptions')
                    .select()
                    .eq('stripe_customer_id', customerId)
                    .single();

                if (dbSubscription) {
                    await supabase
                        .from('subscriptions')
                        .update({ status: 'canceled' })
                        .eq('id', dbSubscription.id);
                }

                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;
                const subscriptionId = invoice.subscription as string;

                if (!subscriptionId) break;

                // Idempotency: skip if this event was already processed
                if (await isEventProcessed(event.id)) {
                    console.log(`Skipping duplicate event: ${event.id}`);
                    break;
                }

                const { data: dbSubscription } = await supabase
                    .from('subscriptions')
                    .select()
                    .eq('stripe_customer_id', customerId)
                    .single();

                if (dbSubscription) {
                    // Grant credits for the billing period
                    const credits = getCreditsForPlan(dbSubscription.plan);
                    if (credits > 0) {
                        await grantCredits(
                            dbSubscription.user_id,
                            credits,
                            `Subscription payment: ${dbSubscription.plan} [${event.id}]`
                        );
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
