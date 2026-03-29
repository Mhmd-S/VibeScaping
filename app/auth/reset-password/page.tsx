'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Supabase redirects with access_token in the URL hash after clicking reset link
        const hash = window.location.hash;
        if (!hash) {
            setError('Invalid or expired reset link. Please request a new one.');
            return;
        }

        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        const type = params.get('type');

        if (!token || type !== 'recovery') {
            setError('Invalid or expired reset link. Please request a new one.');
            return;
        }

        setAccessToken(token);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: accessToken, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to reset password.');
                return;
            }

            setSuccess(true);
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8">
                <div>
                    <h1 className="text-2xl font-bold text-card-foreground">Set New Password</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Enter your new password below.
                    </p>
                </div>

                {success ? (
                    <>
                        <Alert>
                            <AlertDescription>
                                Your password has been reset successfully!
                            </AlertDescription>
                        </Alert>
                        <Button className="w-full" onClick={() => router.push('/auth/signin')}>
                            Go to Sign In
                        </Button>
                    </>
                ) : accessToken ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                disabled={isLoading}
                                className="mt-1"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Must be at least 8 characters
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                disabled={isLoading}
                                className="mt-1"
                            />
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </form>
                ) : (
                    <>
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <Button variant="outline" className="w-full" onClick={() => router.push('/auth/forgot-password')}>
                            Request New Reset Link
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
