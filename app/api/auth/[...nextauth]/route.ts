import NextAuth from 'next-auth';
import { SupabaseAdapter } from '@/lib/supabase-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { supabase } from '@/lib/supabase';
import { compare } from 'bcryptjs';
import type { NextAuthConfig } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            name?: string | null;
            image?: string | null;
        };
    }
}

const config = {
    trustHost: true,
    adapter: SupabaseAdapter() as any,
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const { data: user } = await supabase
                    .from('users')
                    .select()
                    .eq('email', credentials.email as string)
                    .single();

                if (!user || !user.password) {
                    return null;
                }

                const isValid = await compare(
                    credentials.password as string,
                    user.password
                );

                if (!isValid) {
                    return null;
                }

                // Block unverified credential users
                if (!user.email_verified) {
                    throw new Error('email-not-verified');
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/auth/signin',
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                console.log('[auth] jwt callback - user.id:', user.id, 'provider:', account?.provider);
                token.id = user.id;
            }
            console.log('[auth] jwt callback - token.id:', token.id, 'token.sub:', token.sub);
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
            }
            console.log('[auth] session callback - session.user.id:', session.user?.id);
            return session;
        },
    },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

export const { GET, POST } = handlers;
