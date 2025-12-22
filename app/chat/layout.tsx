import ChatLayoutClient from '@/app/components/chat/ChatLayoutClient';
import { getSession } from '@/app/utils/auth';

const ChatLayout = async ({ children }: { children: React.ReactNode }) => {
    const session = await getSession();
    
    return (
        <ChatLayoutClient
            userName={session?.user?.name || 'User'}
            userEmail={session?.user?.email || ''}
            userId={session?.user?.id || null}
        >
            {children}
        </ChatLayoutClient>
    );
};

export default ChatLayout;
