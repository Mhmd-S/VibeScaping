'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DrawingBoardChat from '@/app/components/chat/DrawingBoardChat';
import { getWorkspace } from '@/app/utils/localWorkspace';
import { toast } from '@/components/ui/toast';

const ChatPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const workspaceId = searchParams.get('workspaceId');
    const [isValidWorkspace, setIsValidWorkspace] = useState<boolean | null>(null);

    useEffect(() => {
        // Check if workspace exists when workspaceId is provided
        if (workspaceId) {
            if (typeof window !== 'undefined') {
                const workspace = getWorkspace(workspaceId);
                if (!workspace) {
                    toast.error('Workspace not found');
                    router.replace('/chat');
                    setIsValidWorkspace(false);
                } else {
                    setIsValidWorkspace(true);
                }
            }
        } else {
            setIsValidWorkspace(true);
        }
    }, [workspaceId, router]);

    // Don't render until we've checked workspace validity on client
    if (workspaceId && isValidWorkspace === null) {
        return null; // Will check in useEffect
    }

    if (workspaceId && isValidWorkspace === false) {
        return null; // Will redirect in useEffect
    }

    return <DrawingBoardChat workspaceId={workspaceId || undefined} />;
};

export default ChatPage;
