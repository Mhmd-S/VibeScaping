'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/sonner';

const Providers = ({ children }: { children: React.ReactNode }) => (
    <SessionProvider>
        {children}
        <Toaster />
    </SessionProvider>
);

export default Providers;

