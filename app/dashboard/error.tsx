'use client';

import Link from 'next/link';

const DashboardError = ({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) => (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Something went wrong
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {error.message || 'We could not load your dashboard.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                    Try again
                </button>
                <Link
                    href="/dashboard"
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-blue-400 dark:hover:text-blue-300"
                >
                    Go to dashboard
                </Link>
            </div>
        </div>
    </div>
);

export default DashboardError;

