'use client';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarTrigger,
    useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
    Plus,
    Settings,
    Pencil,
    Trash2,
    LayoutDashboard,
    MessageSquare,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/sidebar-03/logo';
import { NotificationsPopover } from '@/components/sidebar-03/nav-notifications';
import { Button } from '@/components/ui/button';
import { Workspace } from '@/app/types/workspace';
import { DeleteProjectDialog } from '@/app/components/dashboard/DeleteProjectDialog';
import ProfileMenu from '@/app/components/dashboard/ProfileMenu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

interface ChatSidebar03Props {
    workspaces: Workspace[];
    userName: string;
    userEmail: string;
    onWorkspaceCreate: () => void;
    onWorkspaceOpen: (workspaceId: string) => void;
    onWorkspaceRename: (workspaceId: string, name: string) => Promise<void>;
    onWorkspaceDelete: (workspaceId: string) => Promise<void>;
    onRefreshWorkspaces: () => Promise<void>;
}

const sampleNotifications = [
    {
        id: '1',
        avatar: '/avatars/01.png',
        fallback: 'WS',
        text: 'New workspace created.',
        time: '10m ago',
    },
];

export function ChatSidebar03({
    workspaces,
    userName,
    userEmail,
    onWorkspaceCreate,
    onWorkspaceOpen,
    onWorkspaceRename,
    onWorkspaceDelete,
    onRefreshWorkspaces,
}: ChatSidebar03Props) {
    const { state } = useSidebar();
    const router = useRouter();
    const isCollapsed = state === 'collapsed';
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [savingRename, setSavingRename] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const hasWorkspaces = useMemo(() => workspaces.length > 0, [workspaces]);

    const beginRename = (workspace: Workspace) => {
        setRenamingId(workspace.id);
        setRenameValue(workspace.name);
    };

    const cancelRename = () => {
        setRenamingId(null);
        setRenameValue('');
    };

    const handleRename = async (workspaceId: string) => {
        if (!renameValue.trim()) {
            return;
        }

        setSavingRename(true);
        try {
            await onWorkspaceRename(workspaceId, renameValue.trim());
            cancelRename();
        } catch (error) {
            // Error handling is done in parent
        } finally {
            setSavingRename(false);
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete || deletingId) return;

        const { id: workspaceId } = pendingDelete;
        setDeletingId(workspaceId);

        try {
            await onWorkspaceDelete(workspaceId);
            if (renamingId === workspaceId) {
                cancelRename();
            }
            setPendingDelete(null);
        } catch (error) {
            // Error handling is done in parent
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            <Sidebar variant="floating" collapsible="icon">
                <SidebarHeader
                    className={cn(
                        'flex md:pt-3.5',
                        isCollapsed
                            ? 'flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start'
                            : 'flex-row items-center justify-between'
                    )}
                >
                    <a href="/" className="flex items-center gap-2">
                        <Logo className="h-8 w-8" />
                        {!isCollapsed && (
                            <span className="font-semibold text-black dark:text-white">
                                Landscaping
                            </span>
                        )}
                    </a>

                    <motion.div
                        key={isCollapsed ? 'header-collapsed' : 'header-expanded'}
                        className={cn(
                            'flex items-center gap-2',
                            isCollapsed ? 'flex-row md:flex-col-reverse' : 'flex-row'
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                    >
                        <NotificationsPopover notifications={sampleNotifications} />
                        <SidebarTrigger />
                    </motion.div>
                </SidebarHeader>

                <SidebarContent className="gap-4 px-2 py-4">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Chat"
                                asChild
                                className="w-full"
                            >
                                <a
                                    href="/chat"
                                    className={cn(
                                        'flex items-center rounded-lg px-2 transition-colors text-muted-foreground hover:bg-sidebar-muted hover:text-foreground',
                                        isCollapsed && 'justify-center'
                                    )}
                                >
                                    <MessageSquare className="size-4" />
                                    {!isCollapsed && (
                                        <span className="ml-2 text-sm font-medium">Chat</span>
                                    )}
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>

                    <div className="space-y-2">
                        {!isCollapsed && (
                            <div className="px-2">
                                <Button
                                    type="button"
                                    onClick={onWorkspaceCreate}
                                    className="w-full"
                                    size="sm"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Workspace
                                </Button>
                            </div>
                        )}

                        {!isCollapsed && (
                            <div className="px-2">
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                    Workspaces
                                </h2>
                            </div>
                        )}

                        {!hasWorkspaces && !isCollapsed ? (
                            <div className="px-2">
                                <div className="rounded-lg border border-dashed border-border bg-muted px-3 py-6 text-center text-xs text-muted-foreground">
                                    No workspaces yet
                                </div>
                            </div>
                        ) : (
                            <SidebarMenu>
                                {workspaces.map((workspace) => {
                                    const isRenaming = renamingId === workspace.id;
                                    const isSavingThisRename = isRenaming && savingRename;

                                    return (
                                        <SidebarMenuItem key={workspace.id}>
                                            {isRenaming && !isCollapsed ? (
                                                <input
                                                    type="text"
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    onBlur={() => handleRename(workspace.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleRename(workspace.id);
                                                        }
                                                        if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            cancelRename();
                                                        }
                                                    }}
                                                    disabled={isSavingThisRename}
                                                    className="w-full border-b border-border bg-transparent text-sm font-medium outline-none focus:border-primary px-2"
                                                    autoFocus
                                                />
                                            ) : (
                                                <SidebarMenuButton
                                                    tooltip={workspace.name}
                                                    onClick={() => !isRenaming && onWorkspaceOpen(workspace.id)}
                                                    className="group relative w-full"
                                                >
                                                    <LayoutDashboard className="size-4" />
                                                    {!isCollapsed && (
                                                        <>
                                                            <span className="ml-2 flex-1 text-sm font-medium truncate text-left">
                                                                {workspace.name}
                                                            </span>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                                <Button
                                                                    asChild
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    className="h-6 w-6"
                                                                >
                                                                    <div
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            beginRename(workspace);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                beginRename(workspace);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </div>
                                                                </Button>
                                                                <Button
                                                                    asChild
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    className="h-6 w-6"
                                                                >
                                                                    <div
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setPendingDelete({ id: workspace.id, name: workspace.name });
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setPendingDelete({ id: workspace.id, name: workspace.name });
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </div>
                                                                </Button>
                                                            </div>
                                                        </>
                                                    )}
                                                </SidebarMenuButton>
                                            )}
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        )}
                    </div>
                </SidebarContent>

                <SidebarFooter className="px-2 space-y-2">
                    {!isCollapsed && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => router.push('/settings')}
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Button>
                    )}
                    <div className="flex items-center justify-between">
                        <ProfileMenu name={userName} email={userEmail} />
                    </div>
                </SidebarFooter>
            </Sidebar>

            <DeleteProjectDialog
                isOpen={Boolean(pendingDelete)}
                projectName={pendingDelete?.name ?? null}
                isDeleting={Boolean(deletingId)}
                onClose={() => setPendingDelete(null)}
                onConfirm={handleDelete}
            />
        </>
    );
}

