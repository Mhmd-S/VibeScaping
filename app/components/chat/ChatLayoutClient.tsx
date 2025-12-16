'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Workspace } from '@/app/types/workspace';
import { ChatSidebar03 } from '@/app/components/chat/ChatSidebar03';

interface ChatLayoutClientProps {
    children: React.ReactNode;
    initialWorkspaces: Workspace[];
    userName: string;
    userEmail: string;
}

const ChatLayoutClient = ({ children, initialWorkspaces, userName, userEmail }: ChatLayoutClientProps) => {
    const router = useRouter();
    const { data: session } = useSession();
    const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
    const [error, setError] = useState<string | null>(null);

    const refreshWorkspaces = async () => {
        try {
            const response = await fetch('/api/workspaces', { cache: 'no-store' });
            const body = await response.json();

            if (!response.ok) {
                throw new Error(body?.error || 'Unable to load workspaces');
            }

            setWorkspaces(body.workspaces ?? []);
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : 'Unable to load workspaces');
        }
    };

    const handleOpenWorkspace = (workspaceId: string) => {
        router.push(`/editor?workspaceId=${workspaceId}`);
    };

    const handleRename = async (workspaceId: string, name: string) => {
        if (!name.trim()) {
            setError('Workspace name cannot be empty');
            throw new Error('Workspace name cannot be empty');
        }

        setError(null);

        try {
            const response = await fetch(`/api/workspaces/${workspaceId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: name.trim() }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'Could not rename workspace');
            }

            setWorkspaces((current) =>
                current.map((workspace) =>
                    workspace.id === workspaceId
                        ? {
                              ...workspace,
                              name: result.workspace.name,
                              updatedAt: result.workspace.updatedAt,
                          }
                        : workspace,
                ),
            );
        } catch (renameError) {
            const errorMessage = renameError instanceof Error ? renameError.message : 'Could not rename workspace';
            setError(errorMessage);
            throw renameError;
        }
    };

    const handleDelete = async (workspaceId: string) => {
        setError(null);

        try {
            const response = await fetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' });
            const result = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(result?.error || 'Could not delete workspace');
            }

            setWorkspaces((current) => current.filter((workspace) => workspace.id !== workspaceId));
        } catch (deleteError) {
            const errorMessage = deleteError instanceof Error ? deleteError.message : 'Could not delete workspace';
            setError(errorMessage);
            throw deleteError;
        }
    };

    const createWorkspace = async () => {
        const name = `Workspace ${new Date().toLocaleString()}`;
        try {
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'Could not create workspace');
            }

            await refreshWorkspaces();
            router.push(`/editor?workspaceId=${result.workspace.id}`);
        } catch (creationError) {
            setError(creationError instanceof Error ? creationError.message : 'Could not create workspace');
        }
    };

    return (
        <SidebarProvider>
            <div className="relative flex h-screen w-full">
                <ChatSidebar03
                    workspaces={workspaces}
                    userName={userName}
                    userEmail={userEmail}
                    onWorkspaceCreate={createWorkspace}
                    onWorkspaceOpen={handleOpenWorkspace}
                    onWorkspaceRename={handleRename}
                    onWorkspaceDelete={handleDelete}
                    onRefreshWorkspaces={refreshWorkspaces}
                />
                <SidebarInset className="flex flex-col">
                    <main className="flex-1 overflow-hidden">
                        {children}
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
};

export default ChatLayoutClient;

