'use client';

import React from 'react';

import { cn } from './utils';

type ButtonVariant = 'default' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
    default: 'bg-green-600 text-white shadow hover:bg-green-700 focus-visible:ring-green-500',
    secondary: 'border border-zinc-200 bg-white text-zinc-900 hover:border-green-400 hover:text-green-700 focus-visible:ring-green-500',
    ghost: 'text-zinc-700 hover:bg-zinc-100 focus-visible:ring-zinc-300',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
};

export const Button = ({
    className,
    variant = 'default',
    size = 'md',
    type = 'button',
    ...props
}: ButtonProps) => (
    <button
        type={type}
        className={cn(
            'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
            variantClasses[variant],
            sizeClasses[size],
            className,
        )}
        {...props}
    />
);


