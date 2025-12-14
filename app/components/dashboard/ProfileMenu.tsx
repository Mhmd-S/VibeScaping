'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { CreditCard, HelpCircle, LogOut, UserRound } from 'lucide-react';
import { Button } from '../ui/button';

interface ProfileMenuProps {
    name: string;
    email: string;
}

const ProfileMenu = ({ name, email }: ProfileMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleMenu = () => setIsOpen((current) => !current);
    const closeMenu = () => setIsOpen(false);

    const initial = name?.charAt(0)?.toUpperCase() || 'U';

    return (
        <div
            className="relative z-50"
            ref={menuRef}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={closeMenu}
        >
            <Button
                type="button"
                onClick={toggleMenu}
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full"
            >
                {initial}
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-12 z-60 w-64 rounded-2xl border border-border bg-card p-3 shadow-lg">
                    <div className="space-y-1 rounded-xl bg-accent p-3">
                        <p className="text-sm font-semibold text-card-foreground">{name}</p>
                        {email ? <p className="text-xs text-muted-foreground">{email}</p> : null}
                    </div>

                    <div className="mt-3 space-y-1">
                        <Link
                            href="/account"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-card-foreground transition hover:bg-accent hover:text-accent-foreground"
                            onClick={closeMenu}
                        >
                            <UserRound className="h-4 w-4 text-primary" />
                            Account
                        </Link>
                        <Link
                            href="/billing"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-card-foreground transition hover:bg-accent hover:text-accent-foreground"
                            onClick={closeMenu}
                        >
                            <CreditCard className="h-4 w-4 text-primary" />
                            Billing
                        </Link>
                        <Link
                            href="/help"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-card-foreground transition hover:bg-accent hover:text-accent-foreground"
                            onClick={closeMenu}
                        >
                            <HelpCircle className="h-4 w-4 text-primary" />
                            Help
                        </Link>
                    </div>

                    <form action="/api/auth/signout" method="post" className="mt-3 border-t border-border pt-3">
                        <input type="hidden" name="callbackUrl" value="/login" />
                        <Button
                            type="submit"
                            variant="ghost"
                            className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={closeMenu}
                        >
                            <LogOut className="h-4 w-4" />
                            Sign out
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ProfileMenu;

