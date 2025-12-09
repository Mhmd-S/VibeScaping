'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { CreditCard, HelpCircle, LogOut, UserRound } from 'lucide-react';

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
            <button
                type="button"
                onClick={toggleMenu}
                className="flex h-10 z-60 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200 transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
                {initial}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-12 z-60 w-64 rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg">
                    <div className="space-y-1 rounded-xl bg-green-50 p-3">
                        <p className="text-sm font-semibold text-zinc-900">{name}</p>
                        {email ? <p className="text-xs text-zinc-600">{email}</p> : null}
                    </div>

                    <div className="mt-3 space-y-1">
                        <Link
                            href="/account"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-green-50 hover:text-green-700"
                            onClick={closeMenu}
                        >
                            <UserRound className="h-4 w-4 text-green-700" />
                            Account
                        </Link>
                        <Link
                            href="/billing"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-green-50 hover:text-green-700"
                            onClick={closeMenu}
                        >
                            <CreditCard className="h-4 w-4 text-green-700" />
                            Billing
                        </Link>
                        <Link
                            href="/help"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-green-50 hover:text-green-700"
                            onClick={closeMenu}
                        >
                            <HelpCircle className="h-4 w-4 text-green-700" />
                            Help
                        </Link>
                    </div>

                    <form action="/api/auth/signout" method="post" className="mt-3 border-t border-zinc-200 pt-3">
                        <input type="hidden" name="callbackUrl" value="/login" />
                        <button
                            type="submit"
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            onClick={closeMenu}
                        >
                            <LogOut className="h-4 w-4" />
                            Sign out
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ProfileMenu;

