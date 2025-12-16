'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const LoginPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') ?? '/chat';
    const justRegistered = useMemo(() => searchParams.get('registered') === '1', [searchParams]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);

        if (!email || !password) {
            setFormError('Please enter both email and password.');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await signIn('credentials', {
                redirect: false,
                email,
                password,
                callbackUrl,
            });

            if (result?.error) {
                setFormError('Invalid email or password.');
                return;
            }

            router.push(callbackUrl);
            router.refresh();
        } catch (error) {
            setFormError('Unable to sign in. Please try again.');
            console.error('Login failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-card-foreground">
                        Welcome back
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to access your projects dashboard.
                    </p>
                </div>

                {justRegistered && (
                    <Alert className="mb-4">
                        <AlertDescription>
                            Account created successfully. Please sign in.
                        </AlertDescription>
                    </Alert>
                )}

                {formError && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-1">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            placeholder="you@example.com"
                            autoComplete="email"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            minLength={8}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full"
                    >
                        {isSubmitting ? 'Signing in...' : 'Sign in'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    <span>Don't have an account? </span>
                    <Link href="/register" className="font-semibold text-primary hover:text-primary/90">
                        Create one
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

