'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AccountStatus } from '@/app/components/AccountStatus';

const SettingsPage = () => {
    const router = useRouter();

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <h1 className="text-3xl font-bold text-card-foreground">Settings</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Manage your account, subscription, and credits
                </p>
            </div>

            <div className="space-y-6">
                <AccountStatus userId={null} showTopUp />

                <div className="flex flex-col gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/settings/subscription')}
                        className="w-full justify-start"
                    >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Manage Subscription
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push('/settings/topup')}
                        className="w-full justify-start"
                    >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Top Up Credits
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
