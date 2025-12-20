import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import ChatLayoutClient from '@/app/components/chat/ChatLayoutClient';
import { authOptions } from '@/lib/auth';

const ChatLayout = async ({ children }: { children: React.ReactNode }) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    return (
        <ChatLayoutClient
            userName={session.user?.name ?? session.user?.email ?? 'User'}
            userEmail={session.user?.email ?? ''}
        >
            {children}
        </ChatLayoutClient>
    );
};

export default ChatLayout;
