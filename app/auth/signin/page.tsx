'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SignInPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('registered') === 'true') {
            setSuccess('Account created successfully! Please sign in.');
        }
        const errorParam = params.get('error');
        if (errorParam === 'OAuthAccountNotLinked') {
            setError('This email is already associated with a different sign-in method. Please use your original sign-in method.');
        } else if (errorParam) {
            setError('An error occurred during sign-in. Please try again.');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid email or password');
            } else {
                router.push('/chat');
                router.refresh();
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        await signIn('google', { callbackUrl: '/chat' });
    };

    return (
        <div className="container mx-auto flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8">
                <div>
                    <h1 className="text-2xl font-bold text-card-foreground">Sign In</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to your account to continue
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className="mt-1"
                        />
                    </div>

                    {success && (
                        <Alert>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                >
                    Sign in with Google
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <a href="/auth/signup" className="text-primary hover:underline">
                        Sign up
                    </a>
                </p>
            </div>
        </div>
    );
}

