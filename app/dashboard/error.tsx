'use client';

import Link from 'next/link';
import { Button } from '@/app/components/ui/button';

const DashboardError = ({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg rounded-2xl bg-card p-8 shadow-xl">
            <h2 className="text-xl font-semibold text-card-foreground">
                Something went wrong
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
                {error.message || 'We could not load your dashboard.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
                <Button
                    type="button"
                    onClick={reset}
                >
                    Try again
                </Button>
                <Button
                    variant="outline"
                    asChild
                >
                    <Link href="/dashboard">
                        Go to dashboard
                    </Link>
                </Button>
            </div>
        </div>
    </div>
);

export default DashboardError;

