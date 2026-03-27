'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Coins, Sparkles, CreditCard, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { hasApiKey } from '@/app/utils/apiKey';

interface AccountStatusProps {
    userId: string | null;
    compact?: boolean;
    showTopUp?: boolean;
    className?: string;
}

export function AccountStatus({ userId, compact = false, showTopUp = false, className }: AccountStatusProps) {
    const router = useRouter();
    const [subscription, setSubscription] = useState<{ status: string; plan: string } | null>(null);
    const [credits, setCredits] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [usingBYOK, setUsingBYOK] = useState(false);

    useEffect(() => {
        setUsingBYOK(hasApiKey());
        if (userId) {
            loadStatus();
        } else {
            // Try to get userId from session
            fetch('/api/auth/session')
                .then((res) => res.json())
                .then((session) => {
                    if (session?.user?.id) {
                        loadStatus();
                    } else {
                        setIsLoading(false);
                    }
                })
                .catch(() => setIsLoading(false));
        }

        // Refresh status every 30 seconds if user is logged in
        const interval = setInterval(() => {
            loadStatus();
        }, 30000);

        return () => clearInterval(interval);
    }, [userId]);

    const loadStatus = async () => {
        setIsLoading(true);
        try {
            // Check if user is authenticated first
            const sessionResponse = await fetch('/api/auth/session').catch(() => null);
            if (!sessionResponse?.ok) {
                setIsLoading(false);
                return;
            }

            const session = await sessionResponse.json();
            if (!session?.user?.id) {
                setIsLoading(false);
                return;
            }

            const [subResponse, creditsResponse] = await Promise.all([
                fetch('/api/subscription/status').catch(() => null),
                fetch('/api/credits/balance').catch(() => null),
            ]);

            if (subResponse?.ok) {
                const subData = await subResponse.json();
                setSubscription(subData);
            }

            if (creditsResponse?.ok) {
                const creditsData = await creditsResponse.json();
                setCredits(creditsData.balance);
            }
        } catch (err) {
            // Ignore errors
        } finally {
            setIsLoading(false);
        }
    };

    // Don't show anything if explicitly no userId and we're done loading
    if (!userId && !isLoading) {
        // Still try to show if we have subscription/credits data (user might be logged in)
        if (!subscription && credits === null) {
            return null;
        }
    }

    if (isLoading) {
        return (
            <div className={cn('rounded-lg border border-border bg-card p-3', className)}>
                <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
            </div>
        );
    }

    const isActive = subscription?.status === 'active';
    const tier = isActive ? 'paid' : 'free';
    const displayCredits = credits !== null ? credits : 0;

    if (compact) {
        return (
            <div className={cn('rounded-lg border border-border bg-card p-2', className)}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {tier === 'paid' ? (
                            <Crown className="h-4 w-4 text-yellow-500" />
                        ) : (
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Badge variant={tier === 'paid' ? 'default' : 'secondary'} className="text-xs">
                            {usingBYOK ? 'BYOK' : tier === 'paid' ? 'Paid' : 'Free'}
                        </Badge>
                    </div>
                    {!usingBYOK && (
                        <div className="flex items-center gap-1">
                            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-semibold">{displayCredits}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <Card className={cn('border-2', tier === 'paid' ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border', className)}>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {/* Tier Badge */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {tier === 'paid' ? (
                                <>
                                    <Crown className="h-5 w-5 text-yellow-500" />
                                    <div>
                                        <p className="text-sm font-semibold">Paid Tier</p>
                                        <p className="text-xs text-muted-foreground">Active Subscription</p>
                                    </div>
                                </>
                            ) : usingBYOK ? (
                                <>
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="text-sm font-semibold">BYOK Mode</p>
                                        <p className="text-xs text-muted-foreground">Using your own API key</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-semibold">Free Tier</p>
                                        <p className="text-xs text-muted-foreground">Limited access</p>
                                    </div>
                                </>
                            )}
                        </div>
                        <Badge variant={tier === 'paid' ? 'default' : usingBYOK ? 'secondary' : 'outline'} className="text-xs">
                            {usingBYOK ? 'BYOK' : tier === 'paid' ? 'Paid' : 'Free'}
                        </Badge>
                    </div>

                    {/* Credits Display */}
                    {!usingBYOK && (
                        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                            <div className="flex items-center gap-2">
                                <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Credits</p>
                                    <p className="text-2xl font-bold">{displayCredits}</p>
                                </div>
                            </div>
                            {showTopUp && tier === 'paid' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => router.push('/settings/topup')}
                                    className="h-8"
                                >
                                    <CreditCard className="mr-1 h-3 w-3" />
                                    Top Up
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push('/settings/subscription')}
                            className="flex-1 text-xs"
                        >
                            <CreditCard className="mr-1 h-3 w-3" />
                            {tier === 'paid' ? 'Manage' : 'Upgrade'}
                        </Button>
                        {tier === 'paid' && showTopUp && (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => router.push('/settings/topup')}
                                className="flex-1 text-xs"
                            >
                                <Coins className="mr-1 h-3 w-3" />
                                Top Up
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

