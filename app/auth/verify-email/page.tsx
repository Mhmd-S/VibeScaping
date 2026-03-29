'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function VerifyEmailPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        // Supabase redirects with access_token in the URL hash after email verification
        const hash = window.location.hash;
        if (!hash) {
            setStatus('error');
            setMessage('Invalid verification link. Please try signing up again.');
            return;
        }

        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const type = params.get('type');

        if (!accessToken || type !== 'signup') {
            setStatus('error');
            setMessage('Invalid verification link. Please try signing up again.');
            return;
        }

        fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: accessToken }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    setStatus('error');
                    setMessage(data.error);
                } else {
                    setStatus('success');
                    setMessage('Your email has been verified! You can now sign in.');
                }
            })
            .catch(() => {
                setStatus('error');
                setMessage('Verification failed. Please try again.');
            });
    }, []);

    return (
        <div className="container mx-auto flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 text-center">
                <h1 className="text-2xl font-bold text-card-foreground">Email Verification</h1>

                <Alert variant={status === 'error' ? 'destructive' : 'default'}>
                    <AlertDescription>{message}</AlertDescription>
                </Alert>

                {status === 'success' && (
                    <Button className="w-full" onClick={() => router.push('/auth/signin?verified=true')}>
                        Go to Sign In
                    </Button>
                )}

                {status === 'error' && (
                    <Button variant="outline" className="w-full" onClick={() => router.push('/auth/signup')}>
                        Back to Sign Up
                    </Button>
                )}
            </div>
        </div>
    );
}
