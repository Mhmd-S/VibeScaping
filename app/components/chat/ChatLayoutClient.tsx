'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Workspace } from '@/app/types/workspace';
import { ChatSidebar03 } from '@/app/components/chat/ChatSidebar03';
import { toast } from '@/components/ui/toast';
import {
    getAllWorkspaces,
    createWorkspace as createLocalWorkspace,
    updateWorkspace,
    deleteWorkspace as deleteLocalWorkspace,
    getWorkspace,
    toWorkspaceType,
} from '@/app/utils/localWorkspace';

interface ChatLayoutClientProps {
    children: React.ReactNode;
    userName: string;
    userEmail: string;
}

const ChatLayoutClient = ({ children, userName, userEmail }: ChatLayoutClientProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

    useEffect(() => {
        loadWorkspaces();
    }, []);

    const loadWorkspaces = () => {
        const localWorkspaces = getAllWorkspaces();
        setWorkspaces(localWorkspaces.map(toWorkspaceType));
    };

    const refreshWorkspaces = async () => {
        try {
            loadWorkspaces();
            toast.success('Workspaces refreshed');
        } catch (fetchError) {
            const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unable to load workspaces';
            toast.error(errorMessage);
        }
    };

    const handleOpenWorkspace = (workspaceId: string) => {
        router.push(`/chat?workspaceId=${workspaceId}`);
    };

    const handleRename = async (workspaceId: string, name: string) => {
        if (!name.trim()) {
            const errorMessage = 'Workspace name cannot be empty';
            toast.error(errorMessage);
            throw new Error(errorMessage);
        }

        try {
            const updated = updateWorkspace(workspaceId, { name: name.trim() });

            if (!updated) {
                throw new Error('Could not rename workspace');
            }

            setWorkspaces((current) =>
                current.map((workspace) =>
                    workspace.id === workspaceId
                        ? toWorkspaceType(updated)
                        : workspace,
                ),
            );
            toast.success('Workspace renamed successfully');
        } catch (renameError) {
            const errorMessage = renameError instanceof Error ? renameError.message : 'Could not rename workspace';
            toast.error(errorMessage);
            throw renameError;
        }
    };

    const handleDelete = async (workspaceId: string) => {
        try {
            const success = deleteLocalWorkspace(workspaceId);

            if (!success) {
                throw new Error('Could not delete workspace');
            }

            setWorkspaces((current) => current.filter((workspace) => workspace.id !== workspaceId));
            
            // Check if the deleted workspace is the currently active one
            const currentWorkspaceId = searchParams.get('workspaceId');
            if (currentWorkspaceId === workspaceId) {
                // Navigate to chat route without workspaceId (replace to avoid adding to history)
                router.replace('/chat');
            }
            
            toast.success('Workspace deleted successfully');
        } catch (deleteError) {
            const errorMessage = deleteError instanceof Error ? deleteError.message : 'Could not delete workspace';
            toast.error(errorMessage);
            throw deleteError;
        }
    };

    const createWorkspace = async () => {
        const name = `Workspace ${new Date().toLocaleString()}`;
        try {
            const workspace = createLocalWorkspace(name);
            loadWorkspaces();
            toast.success('Workspace created successfully');
            router.push(`/chat?workspaceId=${workspace.id}`);
        } catch (creationError) {
            const errorMessage = creationError instanceof Error ? creationError.message : 'Could not create workspace';
            toast.error(errorMessage);
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

