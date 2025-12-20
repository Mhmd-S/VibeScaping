import ChatLayoutClient from '@/app/components/chat/ChatLayoutClient';

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <ChatLayoutClient
            userName="User"
            userEmail=""
        >
            {children}
        </ChatLayoutClient>
    );
};

export default ChatLayout;
