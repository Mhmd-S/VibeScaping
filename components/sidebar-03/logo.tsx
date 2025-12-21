import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export const Logo = ({ className, ...props }: LogoProps) => (
    <div className={cn('relative flex items-center justify-center', className)} {...props}>
        <Image
            src="/vibescape_logo.png"
            alt="Vibescape Logo"
            fill
            className="object-contain"
            priority
        />
    </div>
);
