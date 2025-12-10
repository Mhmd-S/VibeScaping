'use client';

import React from 'react';

import { cn } from './utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const Card = ({ className, ...props }: CardProps) => (
    <div
        className={cn('rounded-2xl border border-zinc-200 bg-white shadow-sm', className)}
        {...props}
    />
);

export const CardHeader = ({ className, ...props }: CardHeaderProps) => (
    <div className={cn('flex flex-col gap-2 p-4', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: CardTitleProps) => (
    <h3 className={cn('text-base font-semibold text-zinc-900', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: CardDescriptionProps) => (
    <p className={cn('text-sm text-zinc-600', className)} {...props} />
);

export const CardContent = ({ className, ...props }: CardContentProps) => (
    <div className={cn('p-4 pt-0', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: CardFooterProps) => (
    <div className={cn('flex items-center justify-between gap-3 p-4 pt-0', className)} {...props} />
);


