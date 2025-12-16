import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { cookies, headers } from 'next/headers';

import ChatLayoutClient from '@/app/components/chat/ChatLayoutClient';
import { authOptions } from '@/lib/auth';

const ChatLayout = async ({ children }: { children: React.ReactNode }) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const headerStore = await headers();
    const host = headerStore.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        ?? process.env.NEXTAUTH_URL
        ?? (host ? `${protocol}://${host}` : undefined);

    if (!baseUrl) {
        console.error('Failed to load workspaces: missing base URL');
        redirect('/login');
    }

    const response = await fetch(new URL('/api/workspaces', baseUrl), {
        headers: {
            cookie: cookieHeader,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const body = await response.text();
        if (response.status === 401) {
            redirect('/login');
        }
        console.error('Failed to load workspaces', body || response.statusText);
        redirect('/login');
    }

    const { workspaces: serializedWorkspaces } = await response.json();

    return (
        <ChatLayoutClient
            initialWorkspaces={serializedWorkspaces}
            userName={session.user?.name ?? session.user?.email ?? 'User'}
            userEmail={session.user?.email ?? ''}
        >
            {children}
        </ChatLayoutClient>
    );
};

export default ChatLayout;
