'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreditData {
    balance: number;
    freeGenerationsRemaining: number;
    freeGenerationsTotal: number;
}

export default function SubscriptionPage() {
    const router = useRouter();
    const [credits, setCredits] = useState<CreditData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const creditsResponse = await fetch('/api/credits/balance');

            if (creditsResponse.ok) {
                const creditsData = await creditsResponse.json();
                setCredits(creditsData);
            }
        } catch (err) {
            setError('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

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
                <h1 className="text-3xl font-bold text-card-foreground">Credits</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Manage your credits for image generation
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
                    {/* Free Tier Info */}
                    {credits && (
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    Free Generations
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
                                        You&apos;ve used all free generations this month. Purchase credits to continue.
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
                                    >
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Buy Credits
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
