'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
    User,
    ChevronsUpDown,
    Crown,
    Coins,
    Settings,
    LogOut,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { AccountStatus } from '@/app/components/AccountStatus';
import { cn } from '@/lib/utils';

interface SidebarUserMenuProps {
    userName: string;
    userEmail: string;
    userId: string;
    isCollapsed: boolean;
}

export function SidebarUserMenu({ userName, userEmail, userId, isCollapsed }: SidebarUserMenuProps) {
    const router = useRouter();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        'flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-accent',
                        isCollapsed && 'justify-center'
                    )}
                >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                    </div>
                    {!isCollapsed && (
                        <>
                            <span className="flex-1 truncate text-sm font-medium">{userName}</span>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                side={isCollapsed ? 'right' : 'top'}
                align="start"
                sideOffset={8}
                className="w-64 p-0"
            >
                {/* User info header */}
                <div className="flex items-center gap-3 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{userName}</p>
                        <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                    </div>
                </div>

                <Separator />

                {/* Account status */}
                <div className="p-3">
                    <AccountStatus userId={userId} variant="inline" />
                </div>

                <Separator />

                {/* Action links */}
                <div className="py-1">
                    <MenuItem
                        icon={<Crown className="h-4 w-4" />}
                        label="Manage Subscription"
                        onClick={() => router.push('/settings/subscription')}
                    />
                    <MenuItem
                        icon={<Coins className="h-4 w-4" />}
                        label="Top Up Credits"
                        onClick={() => router.push('/settings/topup')}
                    />
                    <MenuItem
                        icon={<Settings className="h-4 w-4" />}
                        label="Settings"
                        onClick={() => router.push('/settings')}
                    />
                </div>

                <Separator />

                <div className="py-1">
                    <MenuItem
                        icon={<LogOut className="h-4 w-4" />}
                        label="Sign Out"
                        onClick={() => signOut({ callbackUrl: '/' })}
                        destructive
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}

function MenuItem({
    icon,
    label,
    onClick,
    destructive = false,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    destructive?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent min-h-[44px] md:min-h-0',
                destructive && 'text-destructive hover:text-destructive hover:bg-destructive/10'
            )}
        >
            {icon}
            {label}
        </button>
    );
}
