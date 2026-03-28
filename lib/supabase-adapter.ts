import type { Adapter, AdapterUser, AdapterAccount, AdapterSession } from 'next-auth/adapters';
import { supabase } from './supabase';

export function SupabaseAdapter(): Adapter {
    return {
        async createUser(user) {
            const { data, error } = await supabase
                .from('users')
                .insert({
                    name: user.name ?? null,
                    email: user.email,
                    email_verified: user.emailVerified?.toISOString() ?? null,
                    image: user.image ?? null,
                })
                .select()
                .single();

            if (error || !data) throw error ?? new Error('Failed to create user');

            return {
                id: data.id,
                name: data.name,
                email: data.email,
                emailVerified: data.email_verified ? new Date(data.email_verified) : null,
                image: data.image,
            };
        },

        async getUser(id) {
            const { data } = await supabase
                .from('users')
                .select()
                .eq('id', id)
                .single();

            if (!data) return null;

            return {
                id: data.id,
                name: data.name,
                email: data.email,
                emailVerified: data.email_verified ? new Date(data.email_verified) : null,
                image: data.image,
            };
        },

        async getUserByEmail(email) {
            const { data } = await supabase
                .from('users')
                .select()
                .eq('email', email)
                .single();

            if (!data) return null;

            return {
                id: data.id,
                name: data.name,
                email: data.email,
                emailVerified: data.email_verified ? new Date(data.email_verified) : null,
                image: data.image,
            };
        },

        async getUserByAccount({ provider, providerAccountId }) {
            const { data: account } = await supabase
                .from('accounts')
                .select('user_id')
                .eq('provider', provider)
                .eq('provider_account_id', providerAccountId)
                .single();

            if (!account) return null;

            const { data: user } = await supabase
                .from('users')
                .select()
                .eq('id', account.user_id)
                .single();

            if (!user) return null;

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                emailVerified: user.email_verified ? new Date(user.email_verified) : null,
                image: user.image,
            };
        },

        async updateUser(user) {
            const updates: Record<string, unknown> = {};
            if (user.name !== undefined) updates.name = user.name;
            if (user.email !== undefined) updates.email = user.email;
            if (user.emailVerified !== undefined)
                updates.email_verified = user.emailVerified?.toISOString() ?? null;
            if (user.image !== undefined) updates.image = user.image;

            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id!)
                .select()
                .single();

            if (error || !data) throw error ?? new Error('Failed to update user');

            return {
                id: data.id,
                name: data.name,
                email: data.email,
                emailVerified: data.email_verified ? new Date(data.email_verified) : null,
                image: data.image,
            };
        },

        async linkAccount(account) {
            await supabase.from('accounts').insert({
                user_id: account.userId,
                type: account.type,
                provider: account.provider,
                provider_account_id: account.providerAccountId,
                refresh_token: account.refresh_token ?? null,
                access_token: account.access_token ?? null,
                expires_at: account.expires_at ?? null,
                token_type: account.token_type ?? null,
                scope: account.scope ?? null,
                id_token: account.id_token ?? null,
                session_state: (account.session_state as string) ?? null,
            });
        },

        async createSession(session) {
            const { data, error } = await supabase
                .from('sessions')
                .insert({
                    session_token: session.sessionToken,
                    user_id: session.userId,
                    expires: session.expires.toISOString(),
                })
                .select()
                .single();

            if (error || !data) throw error ?? new Error('Failed to create session');

            return {
                sessionToken: data.session_token,
                userId: data.user_id,
                expires: new Date(data.expires),
            };
        },

        async getSessionAndUser(sessionToken) {
            const { data: session } = await supabase
                .from('sessions')
                .select()
                .eq('session_token', sessionToken)
                .single();

            if (!session) return null;

            const { data: user } = await supabase
                .from('users')
                .select()
                .eq('id', session.user_id)
                .single();

            if (!user) return null;

            return {
                session: {
                    sessionToken: session.session_token,
                    userId: session.user_id,
                    expires: new Date(session.expires),
                },
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    emailVerified: user.email_verified ? new Date(user.email_verified) : null,
                    image: user.image,
                },
            };
        },

        async updateSession(session) {
            const updates: Record<string, unknown> = {};
            if (session.userId) updates.user_id = session.userId;
            if (session.expires) updates.expires = session.expires.toISOString();

            const { data } = await supabase
                .from('sessions')
                .update(updates)
                .eq('session_token', session.sessionToken)
                .select()
                .single();

            if (!data) return null;

            return {
                sessionToken: data.session_token,
                userId: data.user_id,
                expires: new Date(data.expires),
            };
        },

        async deleteSession(sessionToken) {
            await supabase
                .from('sessions')
                .delete()
                .eq('session_token', sessionToken);
        },

        async createVerificationToken(token) {
            const { data, error } = await supabase
                .from('verification_tokens')
                .insert({
                    identifier: token.identifier,
                    token: token.token,
                    expires: token.expires.toISOString(),
                })
                .select()
                .single();

            if (error || !data) throw error ?? new Error('Failed to create verification token');

            return {
                identifier: data.identifier,
                token: data.token,
                expires: new Date(data.expires),
            };
        },

        async useVerificationToken({ identifier, token }) {
            const { data } = await supabase
                .from('verification_tokens')
                .delete()
                .eq('identifier', identifier)
                .eq('token', token)
                .select()
                .single();

            if (!data) return null;

            return {
                identifier: data.identifier,
                token: data.token,
                expires: new Date(data.expires),
            };
        },
    };
}
