'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';

const LoginPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
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
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                        Welcome back
                    </h1>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Sign in to access your projects dashboard.
                    </p>
                </div>

                {justRegistered && (
                    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/50 dark:text-emerald-100">
                        Account created successfully. Please sign in.
                    </div>
                )}

                {formError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/50 dark:text-red-200">
                        {formError}
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                            placeholder="you@example.com"
                            autoComplete="email"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            minLength={8}
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                        {isSubmitting ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    <span>Don't have an account? </span>
                    <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        Create one
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

