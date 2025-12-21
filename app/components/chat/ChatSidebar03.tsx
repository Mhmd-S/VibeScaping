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
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/sidebar-03/logo';
import { Button } from '@/components/ui/button';
import { Workspace } from '@/app/types/workspace';
import { DeleteProject } from '@/app/components/dialogs/DeleteProject';
import { deleteWorkspaceData } from '@/app/utils/db';
import { restoreWorkspace, toWorkspaceType } from '@/app/utils/localWorkspace';
import { toast } from '@/components/ui/toast';
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

export function ChatSidebar03({
    workspaces,
    onWorkspaceCreate,
    onWorkspaceOpen,
    onWorkspaceRename,
    onWorkspaceDelete,
    onRefreshWorkspaces,
}: ChatSidebar03Props) {
    const { state } = useSidebar();
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeWorkspaceId = searchParams.get('workspaceId');
    const isCollapsed = state === 'collapsed';
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [savingRename, setSavingRename] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const hasWorkspaces = useMemo(() => workspaces.length > 0, [workspaces]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (deleteTimeoutRef.current) {
                clearTimeout(deleteTimeoutRef.current);
            }
        };
    }, []);

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

        const { id: workspaceId, name: workspaceName } = pendingDelete;
        const workspaceToRestore = workspaces.find(w => w.id === workspaceId);
        
        setDeletingId(workspaceId);

        try {
            // 1. Immediately remove from the UI/Metadata
            await onWorkspaceDelete(workspaceId);
            setPendingDelete(null);

            // 2. Clear any existing timeout
            if (deleteTimeoutRef.current) {
                clearTimeout(deleteTimeoutRef.current);
            }

            // 3. Show Toast with Undo Action
            const toastId = toast(`Project "${workspaceName}" deleted`, {
                duration: 5000, // Give them 5 seconds
                action: {
                    label: 'Undo',
                    onClick: async () => {
                        // Clear the pending deletion
                        if (deleteTimeoutRef.current) {
                            clearTimeout(deleteTimeoutRef.current);
                            deleteTimeoutRef.current = null;
                        }
                        
                        if (workspaceToRestore) {
                            // Convert Workspace back to LocalWorkspace for restoration
                            const localWorkspace = {
                                id: workspaceToRestore.id,
                                name: workspaceToRestore.name,
                                description: workspaceToRestore.description,
                                createdAt: workspaceToRestore.createdAt,
                                updatedAt: workspaceToRestore.updatedAt,
                                lastOpenedAt: workspaceToRestore.lastOpenedAt,
                            };
                            // Restore metadata
                            restoreWorkspace(localWorkspace);
                            // Refresh the sidebar list
                            await onRefreshWorkspaces();
                            toast.success('Workspace restored');
                        }
                    },
                },
            });

            // 4. Schedule the heavy permanent deletion after 5 seconds
            deleteTimeoutRef.current = setTimeout(async () => {
                // Perform the heavy permanent deletion only now
                await deleteWorkspaceData(workspaceId);
                deleteTimeoutRef.current = null;
            }, 5000);

            // 5. If we just deleted what we are looking at...
            if (activeWorkspaceId === workspaceId) {
                // Clear the "anonymous" cache so the next screen is truly empty
                await deleteWorkspaceData('anonymous_temp');
                
                // Redirect to fresh chat
                router.push('/chat');
            }

        } catch (error) {
            console.error('Delete failed', error);
            toast.error('Failed to delete project');
            // Clear timeout on error
            if (deleteTimeoutRef.current) {
                clearTimeout(deleteTimeoutRef.current);
                deleteTimeoutRef.current = null;
            }
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
                    <a href="/" className="flex items-center gap-0.5">
                        <Logo className="h-12 w-12" />
                        {!isCollapsed && (
                            <span className="font-semibold text-black dark:text-white">
                                Vibescaping
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
                        <SidebarTrigger />
                    </motion.div>
                </SidebarHeader>

                <SidebarContent className="gap-4 px-2 py-4">
                    <SidebarMenu>
                        <SidebarMenuItem>

                        </SidebarMenuItem>
                    </SidebarMenu>

                    <div className="space-y-2">
                        {!isCollapsed && (
                            <div className="px-2">
                                <Button
                                    type="button"
                                    onClick={onWorkspaceCreate}
                                    className="w-full mb-4"
                                    size="sm"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Project
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
                                    const isActive = activeWorkspaceId === workspace.id;

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
                                                    className="w-full border-b border-border bg-transparent text-xs font-medium outline-none focus:border-primary px-2"
                                                    autoFocus
                                                />
                                            ) : (
                                                <SidebarMenuButton
                                                    tooltip={workspace.name}
                                                    onClick={() => !isRenaming && onWorkspaceOpen(workspace.id)}
                                                    isActive={isActive}
                                                    className={cn(
                                                        'group relative w-full transition-colors',
                                                        isActive && 'bg-primary/10 text-primary font-bold hover:bg-primary/15'
                                                    )}
                                                >
                                                    <LayoutDashboard className={cn(
                                                        'size-4',
                                                        isActive ? 'text-primary' : 'text-muted-foreground'
                                                    )} />
                                                    {!isCollapsed && (
                                                        <>
                                                            <span className="ml-2 flex-1 text-xs truncate text-left">
                                                                {workspace.name}
                                                            </span>
                                                            <div className={cn(
                                                                'flex gap-1 transition-opacity ml-2',
                                                                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                            )}>
                                                                <div
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    className="h-6 w-6 hover:text-primary flex items-center justify-center rounded-md hover:bg-accent cursor-pointer transition-colors"
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
                                                                <div
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    className="h-6 w-6 hover:text-destructive flex items-center justify-center rounded-md hover:bg-accent cursor-pointer transition-colors"
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
                </SidebarFooter>
            </Sidebar>

            <DeleteProject
                open={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onDelete={handleDelete}
            />
        </>
    );
}

