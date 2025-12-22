import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getCreditsForPlan } from '@/app/utils/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

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
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
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
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;
                const userId = session.metadata?.userId;
                const paymentType = session.metadata?.type;

                if (!userId) {
                    console.error('No userId in metadata');
                    break;
                }

                // Handle top-up payments (one-time payments)
                if (paymentType === 'topup') {
                    const credits = parseInt(session.metadata?.credits || '0', 10);
                    if (credits > 0) {
                        await grantCreditsToUser(
                            userId,
                            credits,
                            `Top-up purchase: ${session.metadata?.productId || 'unknown'}`
                        );
                    }
                    break;
                }

                // Handle subscription payments
                if (!subscriptionId) {
                    console.error('No subscription ID for subscription checkout');
                    break;
                }

                // Get subscription details
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const planId = session.metadata?.planId || 'basic';

                // Update subscription in database
                await prisma.subscription.update({
                    where: { userId },
                    data: {
                        stripeSubscriptionId: subscriptionId,
                        status: subscription.status === 'active' ? 'active' : 'incomplete',
                        plan: planId,
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    },
                });

                // Grant credits for the subscription period
                const credits = getCreditsForPlan(planId);
                if (credits > 0) {
                    await grantCreditsToUser(userId, credits, `Subscription: ${planId}`);
                }

                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                const dbSubscription = await prisma.subscription.findUnique({
                    where: { stripeCustomerId: customerId },
                });

                if (dbSubscription) {
                    await prisma.subscription.update({
                        where: { id: dbSubscription.id },
                        data: {
                            status: subscription.status,
                            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        },
                    });
                }

                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                const dbSubscription = await prisma.subscription.findUnique({
                    where: { stripeCustomerId: customerId },
                });

                if (dbSubscription) {
                    await prisma.subscription.update({
                        where: { id: dbSubscription.id },
                        data: {
                            status: 'canceled',
                        },
                    });
                }

                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;
                const subscriptionId = invoice.subscription as string;

                if (!subscriptionId) break;

                const dbSubscription = await prisma.subscription.findUnique({
                    where: { stripeCustomerId: customerId },
                });

                if (dbSubscription) {
                    // Grant credits for the new billing period
                    const credits = getCreditsForPlan(dbSubscription.plan);
                    if (credits > 0) {
                        await grantCreditsToUser(
                            dbSubscription.userId,
                            credits,
                            `Subscription renewal: ${dbSubscription.plan}`
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

async function grantCreditsToUser(userId: string, amount: number, reason: string) {
    // Get or create credit balance
    let creditBalance = await prisma.creditBalance.findUnique({
        where: { userId },
    });

    if (!creditBalance) {
        creditBalance = await prisma.creditBalance.create({
            data: {
                userId,
                balance: amount,
            },
        });
    } else {
        creditBalance = await prisma.creditBalance.update({
            where: { userId },
            data: {
                balance: {
                    increment: amount,
                },
            },
        });
    }

    // Log transaction
    await prisma.creditTransaction.create({
        data: {
            userId,
            type: 'grant',
            amount,
            reason,
        },
    });
}

