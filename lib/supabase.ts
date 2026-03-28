import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/app/types/supabase';

const globalForSupabase = globalThis as unknown as {
    supabase: SupabaseClient<Database> | undefined;
};

function getSupabaseClient(): SupabaseClient<Database> {
    if (globalForSupabase.supabase) return globalForSupabase.supabase;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error(
            'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
        );
    }

    const client = createClient<Database>(supabaseUrl, supabaseServiceKey);

    if (process.env.NODE_ENV !== 'production') {
        globalForSupabase.supabase = client;
    }

    return client;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
    get(_, prop) {
        const client = getSupabaseClient();
        const value = (client as any)[prop];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    },
});
