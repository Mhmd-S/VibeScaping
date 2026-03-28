export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    name: string | null;
                    email: string;
                    email_verified: string | null;
                    image: string | null;
                    password: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name?: string | null;
                    email: string;
                    email_verified?: string | null;
                    image?: string | null;
                    password?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string | null;
                    email?: string;
                    email_verified?: string | null;
                    image?: string | null;
                    password?: string | null;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'accounts_user_id_fkey';
                        columns: ['id'];
                        isOneToOne: false;
                        referencedRelation: 'accounts';
                        referencedColumns: ['user_id'];
                    },
                ];
            };
            accounts: {
                Row: {
                    id: string;
                    user_id: string;
                    type: string;
                    provider: string;
                    provider_account_id: string;
                    refresh_token: string | null;
                    access_token: string | null;
                    expires_at: number | null;
                    token_type: string | null;
                    scope: string | null;
                    id_token: string | null;
                    session_state: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    type: string;
                    provider: string;
                    provider_account_id: string;
                    refresh_token?: string | null;
                    access_token?: string | null;
                    expires_at?: number | null;
                    token_type?: string | null;
                    scope?: string | null;
                    id_token?: string | null;
                    session_state?: string | null;
                };
                Update: {
                    user_id?: string;
                    type?: string;
                    provider?: string;
                    provider_account_id?: string;
                    refresh_token?: string | null;
                    access_token?: string | null;
                    expires_at?: number | null;
                    token_type?: string | null;
                    scope?: string | null;
                    id_token?: string | null;
                    session_state?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'accounts_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
            sessions: {
                Row: {
                    id: string;
                    session_token: string;
                    user_id: string;
                    expires: string;
                };
                Insert: {
                    id?: string;
                    session_token: string;
                    user_id: string;
                    expires: string;
                };
                Update: {
                    session_token?: string;
                    user_id?: string;
                    expires?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'sessions_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
            verification_tokens: {
                Row: {
                    identifier: string;
                    token: string;
                    expires: string;
                };
                Insert: {
                    identifier: string;
                    token: string;
                    expires: string;
                };
                Update: {
                    identifier?: string;
                    token?: string;
                    expires?: string;
                };
                Relationships: [];
            };
            subscriptions: {
                Row: {
                    id: string;
                    user_id: string;
                    stripe_customer_id: string;
                    stripe_subscription_id: string | null;
                    status: string;
                    plan: string;
                    current_period_end: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    stripe_customer_id: string;
                    stripe_subscription_id?: string | null;
                    status: string;
                    plan: string;
                    current_period_end?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    user_id?: string;
                    stripe_customer_id?: string;
                    stripe_subscription_id?: string | null;
                    status?: string;
                    plan?: string;
                    current_period_end?: string | null;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'subscriptions_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: true;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
            credit_balances: {
                Row: {
                    id: string;
                    user_id: string;
                    balance: number;
                    free_generations_used: number;
                    free_generations_reset_date: string;
                    last_reset_date: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    balance?: number;
                    free_generations_used?: number;
                    free_generations_reset_date?: string;
                    last_reset_date?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    user_id?: string;
                    balance?: number;
                    free_generations_used?: number;
                    free_generations_reset_date?: string;
                    last_reset_date?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'credit_balances_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: true;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
            credit_transactions: {
                Row: {
                    id: string;
                    user_id: string;
                    type: string;
                    amount: number;
                    model: string | null;
                    workspace_id: string | null;
                    reason: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    type: string;
                    amount: number;
                    model?: string | null;
                    workspace_id?: string | null;
                    reason?: string | null;
                    created_at?: string;
                };
                Update: {
                    user_id?: string;
                    type?: string;
                    amount?: number;
                    model?: string | null;
                    workspace_id?: string | null;
                    reason?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'credit_transactions_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
            workspaces: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    description: string | null;
                    created_at: string;
                    updated_at: string;
                    last_opened_at: string | null;
                };
                Insert: {
                    id: string;
                    user_id: string;
                    name: string;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    last_opened_at?: string | null;
                };
                Update: {
                    user_id?: string;
                    name?: string;
                    description?: string | null;
                    updated_at?: string;
                    last_opened_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'workspaces_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
            workspace_data: {
                Row: {
                    id: string;
                    workspace_id: string;
                    cloudflare_url: string;
                    data_hash: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    workspace_id: string;
                    cloudflare_url: string;
                    data_hash: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    workspace_id?: string;
                    cloudflare_url?: string;
                    data_hash?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'workspace_data_workspace_id_fkey';
                        columns: ['workspace_id'];
                        isOneToOne: true;
                        referencedRelation: 'workspaces';
                        referencedColumns: ['id'];
                    },
                ];
            };
            image_assets: {
                Row: {
                    id: string;
                    workspace_id: string;
                    user_id: string;
                    cloudflare_url: string;
                    mime_type: string;
                    metadata: Json | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    workspace_id: string;
                    user_id: string;
                    cloudflare_url: string;
                    mime_type: string;
                    metadata?: Json | null;
                    created_at?: string;
                };
                Update: {
                    workspace_id?: string;
                    user_id?: string;
                    cloudflare_url?: string;
                    mime_type?: string;
                    metadata?: Json | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'image_assets_workspace_id_fkey';
                        columns: ['workspace_id'];
                        isOneToOne: false;
                        referencedRelation: 'workspaces';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'image_assets_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            deduct_credits: {
                Args: {
                    p_user_id: string;
                    p_amount: number;
                };
                Returns: number | null;
            };
            use_free_generation: {
                Args: {
                    p_user_id: string;
                    p_max_free: number;
                };
                Returns: number | null;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};
