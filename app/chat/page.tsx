'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DrawingBoardChat from '@/app/components/chat/DrawingBoardChat';
import { getWorkspace } from '@/app/utils/localWorkspace';
import { toast } from '@/components/ui/toast';

const ChatPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const workspaceId = searchParams.get('workspaceId');

    useEffect(() => {
        // Check if workspace exists when workspaceId is provided
        if (workspaceId) {
            const workspace = getWorkspace(workspaceId);
            if (!workspace) {
                toast.error('Workspace not found');
                router.replace('/chat');
            }
        }
    }, [workspaceId, router]);

    // Don't render if workspace doesn't exist (will redirect)
    if (workspaceId) {
        const workspace = getWorkspace(workspaceId);
        if (!workspace) {
            return null; // Will redirect in useEffect
        }
    }

    return <DrawingBoardChat workspaceId={workspaceId || undefined} />;
};

export default ChatPage;
