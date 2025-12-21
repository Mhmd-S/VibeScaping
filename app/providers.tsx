'use client';

import { Toaster } from '@/components/ui/sonner';

const Providers = ({ children }: { children: React.ReactNode }) => (
    <>
        {children}
        <Toaster />
    </>
);

export default Providers;

