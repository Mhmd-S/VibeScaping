'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface SubscriptionData {
    status: string;
    plan: string;
    currentPeriodEnd: string | null;
}

interface CreditData {
    balance: number;
}

export default function SubscriptionPage() {
    const router = useRouter();
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [credits, setCredits] = useState<CreditData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSubscriptionData();
    }, []);

    const loadSubscriptionData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [subResponse, creditsResponse] = await Promise.all([
                fetch('/api/subscription/status'),
                fetch('/api/credits/balance'),
            ]);

            if (subResponse.ok) {
                const subData = await subResponse.json();
                setSubscription(subData);
            }

            if (creditsResponse.ok) {
                const creditsData = await creditsResponse.json();
                setCredits(creditsData);
            }
        } catch (err) {
            setError('Failed to load subscription data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubscribe = async (planId: string) => {
        setIsProcessing(true);
        setError(null);

        try {
            const response = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to create checkout session');
                return;
            }

            // Redirect to Stripe checkout
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            setError('Failed to start checkout process');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManageSubscription = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            const response = await fetch('/api/stripe/create-portal', {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to create portal session');
                return;
            }

            // Redirect to Stripe customer portal
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            setError('Failed to open customer portal');
        } finally {
            setIsProcessing(false);
        }
    };

    const isActive = subscription?.status === 'active';
    const planName = subscription?.plan
        ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
        : null;

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <h1 className="text-3xl font-bold text-card-foreground">Subscription</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Manage your subscription and credits
                </p>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {isLoading ? (
                <div className="text-center py-8">Loading...</div>
            ) : (
                <div className="space-y-6">
                    {/* Current Subscription Status */}
                    {subscription && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Current Subscription</CardTitle>
                                <CardDescription>
                                    Your subscription status and plan details
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">Status</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <Badge variant={isActive ? 'default' : 'secondary'}>
                                                {isActive ? (
                                                    <>
                                                        <Check className="mr-1 h-3 w-3" />
                                                        Active
                                                    </>
                                                ) : (
                                                    <>
                                                        <X className="mr-1 h-3 w-3" />
                                                        {subscription.status}
                                                    </>
                                                )}
                                            </Badge>
                                        </div>
                                    </div>
                                    {planName && (
                                        <div>
                                            <p className="text-sm font-medium">Plan</p>
                                            <p className="mt-1 text-lg font-semibold">{planName}</p>
                                        </div>
                                    )}
                                </div>

                                {subscription.currentPeriodEnd && (
                                    <div>
                                        <p className="text-sm font-medium">Renews on</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}

                                {isActive && (
                                    <Button
                                        onClick={handleManageSubscription}
                                        disabled={isProcessing}
                                        variant="outline"
                                    >
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Manage Subscription
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Credit Balance */}
                    {credits && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Credit Balance</CardTitle>
                                <CardDescription>
                                    Credits available for image generation
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-3xl font-bold">{credits.balance}</p>
                                        <p className="text-sm text-muted-foreground">credits remaining</p>
                                    </div>
                                    {isActive && (
                                        <Button
                                            onClick={() => router.push('/settings/topup')}
                                            variant="outline"
                                        >
                                            <CreditCard className="mr-2 h-4 w-4" />
                                            Top Up Credits
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Top Up Section for Active Subscribers */}
                    {isActive && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Up Credits</CardTitle>
                                <CardDescription>
                                    Purchase additional credits when you need more
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Need more credits? Purchase additional credit packages to top up your account.
                                </p>
                                <Button
                                    onClick={() => router.push('/settings/topup')}
                                    className="w-full"
                                >
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    View Top-Up Options
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Subscribe Section */}
                    {!isActive && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Subscribe</CardTitle>
                                <CardDescription>
                                    Choose a plan to get started with cloud storage and credits
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="rounded-lg border border-border p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <h3 className="font-semibold">Basic Plan</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    75 credits/month
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">$9.99</p>
                                                <p className="text-xs text-muted-foreground">per month</p>
                                            </div>
                                        </div>
                                        <ul className="mt-4 space-y-2 text-sm">
                                            <li className="flex items-center">
                                                <Check className="mr-2 h-4 w-4 text-primary" />
                                                Cloud storage for workspaces
                                            </li>
                                            <li className="flex items-center">
                                                <Check className="mr-2 h-4 w-4 text-primary" />
                                                75 credits per month
                                            </li>
                                            <li className="flex items-center">
                                                <Check className="mr-2 h-4 w-4 text-primary" />
                                                Sync across devices
                                            </li>
                                        </ul>
                                        <Button
                                            className="mt-4 w-full"
                                            onClick={() => handleSubscribe('basic')}
                                            disabled={isProcessing}
                                        >
                                            Subscribe to Basic
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

