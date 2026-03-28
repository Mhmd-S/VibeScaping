'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CreditCard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TOP_UP_PRODUCTS } from '@/app/utils/subscription-plans';

interface CreditData {
    balance: number;
}

export default function TopUpPage() {
    return (
        <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
            <TopUpContent />
        </Suspense>
    );
}

function TopUpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [credits, setCredits] = useState<CreditData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const successParam = searchParams.get('success');
        const creditsParam = searchParams.get('credits');
        if (successParam === 'true' && creditsParam) {
            setSuccess(`Successfully purchased ${creditsParam} credits!`);
            // Reload credit balance
            loadData();
        }

        const canceledParam = searchParams.get('canceled');
        if (canceledParam === 'true') {
            setError('Top-up was canceled');
        }

        loadData();
    }, [searchParams]);

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

    const handleTopUp = async (productId: string) => {
        setIsProcessing(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/stripe/create-topup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || data.details || 'Failed to create checkout session');
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
                <h1 className="text-3xl font-bold text-card-foreground">Top Up Credits</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Purchase additional credits for image generation
                </p>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                        {success}
                    </AlertDescription>
                </Alert>
            )}

            {isLoading ? (
                <div className="text-center py-8">Loading...</div>
            ) : (
                <div className="space-y-6">
                    {/* Current Credit Balance */}
                    {credits && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Current Balance</CardTitle>
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
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Top-Up Products */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Purchase Credits</CardTitle>
                            <CardDescription>
                                Choose a credit package to top up your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                {TOP_UP_PRODUCTS.map((product) => (
                                    <div
                                        key={product.id}
                                        className="rounded-lg border border-border p-4 hover:border-primary transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <h3 className="font-semibold">{product.name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {product.credits} credits
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">${product.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-xs text-muted-foreground mb-2">
                                                ${(product.price / product.credits).toFixed(3)} per credit
                                            </p>
                                            <Button
                                                className="w-full"
                                                onClick={() => handleTopUp(product.id)}
                                                disabled={isProcessing}
                                            >
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                Purchase {product.name}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>About Credits</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <p>
                                • Credits are used for image generation based on the model you choose
                            </p>
                            <p>
                                • Gemini 2.5 Flash: 1 credit per generation
                            </p>
                            <p>
                                • Gemini 3 Pro (Banana Pro): 5 credits per generation
                            </p>
                            <p>
                                • Credits never expire and can be used anytime
                            </p>
                            <p>
                                • Purchase credit packs anytime to keep generating
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

