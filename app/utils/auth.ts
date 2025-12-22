import { auth } from '@/app/api/auth/[...nextauth]/route';

export const getSession = async () => {
    return await auth();
};

export const requireAuth = async () => {
    const session = await getSession();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }
    return session;
};

export const getUserId = async (): Promise<string | null> => {
    const session = await getSession();
    return session?.user?.id || null;
};

