'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Something went wrong.');
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
                    <h1 className="text-2xl font-bold text-card-foreground">Reset Password</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Enter your email and we'll send you a link to reset your password.
                    </p>
                </div>

                {success ? (
                    <Alert>
                        <AlertDescription>
                            If an account exists with that email, you'll receive a password reset link shortly. Check your inbox.
                        </AlertDescription>
                    </Alert>
                ) : (
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

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                    </form>
                )}

                <p className="text-center text-sm text-muted-foreground">
                    <a href="/auth/signin" className="text-primary hover:underline">
                        Back to Sign In
                    </a>
                </p>
            </div>
        </div>
    );
}
