'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Check, X, Sparkles } from 'lucide-react';
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
    freeGenerationsRemaining: number;
    freeGenerationsTotal: number;
    tier: string;
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

                    {/* Free Tier Info */}
                    {credits && credits.tier === 'free' && (
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    Free Tier
                                </CardTitle>
                                <CardDescription>
                                    You get {credits.freeGenerationsTotal} free image generations per month
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium">Generations used this month</span>
                                    <span className="text-lg font-bold">
                                        {credits.freeGenerationsTotal - credits.freeGenerationsRemaining}/{credits.freeGenerationsTotal}
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-primary transition-all"
                                        style={{ width: `${(credits.freeGenerationsRemaining / credits.freeGenerationsTotal) * 100}%` }}
                                    />
                                </div>
                                {credits.freeGenerationsRemaining === 0 && (
                                    <p className="text-sm text-muted-foreground mt-3">
                                        You&apos;ve used all free generations this month. Subscribe or purchase credits to continue.
                                    </p>
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
                                    <Button
                                        onClick={() => router.push('/settings/topup')}
                                        variant="outline"
                                    >
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Top Up Credits
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Subscribe Section */}
                    {!isActive && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Subscribe</CardTitle>
                                <CardDescription>
                                    Choose a plan to unlock more generations and premium features
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {/* Monthly Plan */}
                                    <div className="rounded-lg border border-border p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <h3 className="font-semibold">Monthly</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    100 credits/month
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">$20</p>
                                                <p className="text-xs text-muted-foreground">per month</p>
                                            </div>
                                        </div>
                                        <ul className="mt-4 space-y-2 text-sm">
                                            <li className="flex items-center">
                                                <Check className="mr-2 h-4 w-4 text-primary" />
                                                ~37-38 mixed prompts/month
                                            </li>
                                            <li className="flex items-center">
                                                <Check className="mr-2 h-4 w-4 text-primary" />
                                                All AI models included
                                            </li>
                                            <li className="flex items-center">
                                                <Check className="mr-2 h-4 w-4 text-primary" />
                                                Cloud workspace sync
                                            </li>
                                        </ul>
                                        <Button
                                            className="mt-4 w-full"
                                            onClick={() => handleSubscribe('monthly')}
                                            disabled={isProcessing}
                                        >
                                            Subscribe Monthly
                                        </Button>
                                    </div>

                                    {/* Yearly Plan */}
                                    <div className="rounded-lg border-2 border-primary p-4 relative">
                                        <Badge className="absolute -top-2.5 right-4 text-xs">Save 20%</Badge>
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <h3 className="font-semibold">Yearly</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    110 credits/month (10% bonus)
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">$192</p>
                                                <p className="text-xs text-muted-foreground">per year ($16/mo)</p>
                                            </div>
                                        </div>
                                        <ul className="mt-4 space-y-2 text-sm">
                                            <li className="flex items-center">
                                                <Check className="mr-2 h-4 w-4 text-primary" />
                                                ~41-42 mixed prompts/month
                                            </li>
                                            <li className="flex items-center">
                                                <Check className="mr-2 h-4 w-4 text-primary" />
                                                All AI models included
                                            </li>
                                            <li className="flex items-center">
                                                <Check className="mr-2 h-4 w-4 text-primary" />
                                                Cloud workspace sync
                                            </li>
                                            <li className="flex items-center">
                                                <Check className="mr-2 h-4 w-4 text-primary" />
                                                10% bonus credits monthly
                                            </li>
                                        </ul>
                                        <Button
                                            className="mt-4 w-full"
                                            onClick={() => handleSubscribe('yearly')}
                                            disabled={isProcessing}
                                        >
                                            Subscribe Yearly
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Top Up Section */}
                    {isActive && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Up Credits</CardTitle>
                                <CardDescription>
                                    Purchase additional credits when you need more
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
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
                </div>
            )}
        </div>
    );
}
