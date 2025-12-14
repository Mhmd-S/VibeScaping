'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const RegisterPage = () => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);

        if (password !== confirmPassword) {
            setFormError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setFormError('Password must be at least 8 characters.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const result = await response.json();

            if (!response.ok) {
                setFormError(result?.error || 'Unable to create your account.');
                return;
            }

            router.push('/login?registered=1');
        } catch (error) {
            console.error('Registration failed:', error);
            setFormError('Unable to create your account. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-card-foreground">
                        Create your account
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Set up your credentials to start saving landscape projects.
                    </p>
                </div>

                {formError && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-1">
                        <Label htmlFor="name">Full name</Label>
                        <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                            minLength={2}
                            placeholder="Alex Taylor"
                            autoComplete="name"
                        />
                    </div>

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
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="confirmPassword">Confirm password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            required
                            minLength={8}
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full"
                    >
                        {isSubmitting ? 'Creating account...' : 'Create account'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    <span>Already have an account? </span>
                    <Link href="/login" className="font-semibold text-primary hover:text-primary/90">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;

