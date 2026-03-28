'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AccountStatusProps {
    userId: string | null;
    compact?: boolean;
    showTopUp?: boolean;
    variant?: 'card' | 'inline';
    className?: string;
}

export function AccountStatus({ userId, compact = false, showTopUp = false, variant = 'card', className }: AccountStatusProps) {
    const router = useRouter();
    const [credits, setCredits] = useState<number | null>(null);
    const [freeGenerationsRemaining, setFreeGenerationsRemaining] = useState<number | null>(null);
    const [freeGenerationsTotal, setFreeGenerationsTotal] = useState<number>(5);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            loadStatus();
        } else {
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

        const interval = setInterval(() => {
            loadStatus();
        }, 30000);

        return () => clearInterval(interval);
    }, [userId]);

    const loadStatus = async () => {
        setIsLoading(true);
        try {
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

            const creditsResponse = await fetch('/api/credits/balance').catch(() => null);

            if (creditsResponse?.ok) {
                const creditsData = await creditsResponse.json();
                setCredits(creditsData.balance);
                setFreeGenerationsRemaining(creditsData.freeGenerationsRemaining ?? null);
                setFreeGenerationsTotal(creditsData.freeGenerationsTotal ?? 5);
            }
        } catch (err) {
            // Ignore errors
        } finally {
            setIsLoading(false);
        }
    };

    if (!userId && !isLoading) {
        if (credits === null) {
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

    const displayCredits = credits !== null ? credits : 0;

    if (compact) {
        return (
            <div className={cn('rounded-lg border border-border bg-card p-2', className)}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-semibold">{displayCredits}</span>
                    </div>
                    {freeGenerationsRemaining !== null && (
                        <span className="text-xs text-muted-foreground">{freeGenerationsRemaining} free</span>
                    )}
                </div>
            </div>
        );
    }

    const content = (
        <div className="space-y-2">
            {/* Credits row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xs font-semibold">Credits</span>
                </div>
                <span className="text-sm font-bold">{displayCredits}</span>
            </div>

            {/* Free generations progress */}
            {freeGenerationsRemaining !== null && (
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-muted-foreground">Free generations</span>
                        <span className="text-[11px] font-medium">{freeGenerationsRemaining}/{freeGenerationsTotal}</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${(freeGenerationsRemaining / freeGenerationsTotal) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Actions */}
            {variant !== 'inline' && (
                <div className="flex gap-1.5">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push('/settings/topup')}
                        className="flex-1 h-7 text-[11px]"
                    >
                        Buy Credits
                    </Button>
                </div>
            )}
        </div>
    );

    if (variant === 'inline') {
        return <div className={className}>{content}</div>;
    }

    return (
        <div className={cn('rounded-lg border border-border bg-card p-3', className)}>
            {content}
        </div>
    );
}
