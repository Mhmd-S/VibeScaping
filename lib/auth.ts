import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

const credentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    providers: [
        Credentials({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            authorize: async (credentials) => {
                const parsed = credentialsSchema.safeParse(credentials);
                if (!parsed.success) {
                    return null;
                }

                const normalizedEmail = parsed.data.email.toLowerCase();

                const user = await prisma.user.findUnique({
                    where: { email: normalizedEmail },
                });

                if (!user || !user.password) {
                    return null;
                }

                const isValidPassword = await compare(parsed.data.password, user.password);
                if (!isValidPassword) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                };
            },
        }),
    ],
    callbacks: {
        jwt: async ({ token, user }) => {
            if (user?.id) {
                token.sub = user.id;
            }
            return token;
        },
        session: async ({ session, token, user }) => {
            if (session.user) {
                session.user.id = user?.id || token?.sub || '';
            }
            return session;
        },
    },
};

export const getServerAuthSession = () => getServerSession(authOptions);

