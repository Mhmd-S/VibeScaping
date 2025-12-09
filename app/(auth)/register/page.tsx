'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

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
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                        Create your account
                    </h1>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Set up your credentials to start saving landscape projects.
                    </p>
                </div>

                {formError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/50 dark:text-red-200">
                        {formError}
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Full name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                            minLength={2}
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                            placeholder="Alex Taylor"
                            autoComplete="name"
                        />
                    </div>

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
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Confirm password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            required
                            minLength={8}
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                        {isSubmitting ? 'Creating account...' : 'Create account'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    <span>Already have an account? </span>
                    <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;

