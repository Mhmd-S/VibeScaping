-- Supabase migration: Create all tables for the landscaping app
-- Run this in the Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Users table
create table if not exists users (
    id text primary key default gen_random_uuid()::text,
    name text,
    email text unique not null,
    email_verified timestamptz,
    image text,
    password text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Accounts table (OAuth providers)
create table if not exists accounts (
    id text primary key default gen_random_uuid()::text,
    user_id text not null references users(id) on delete cascade,
    type text not null,
    provider text not null,
    provider_account_id text not null,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    unique(provider, provider_account_id)
);

-- Sessions table
create table if not exists sessions (
    id text primary key default gen_random_uuid()::text,
    session_token text unique not null,
    user_id text not null references users(id) on delete cascade,
    expires timestamptz not null
);

-- Verification tokens table
create table if not exists verification_tokens (
    identifier text not null,
    token text unique not null,
    expires timestamptz not null,
    unique(identifier, token)
);

-- Subscriptions table
create table if not exists subscriptions (
    id text primary key default gen_random_uuid()::text,
    user_id text unique not null references users(id) on delete cascade,
    stripe_customer_id text unique not null,
    stripe_subscription_id text unique,
    status text not null,
    plan text not null,
    current_period_end timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Credit balances table
create table if not exists credit_balances (
    id text primary key default gen_random_uuid()::text,
    user_id text unique not null references users(id) on delete cascade,
    balance integer not null default 0,
    free_generations_used integer not null default 0,
    free_generations_reset_date timestamptz not null default now(),
    last_reset_date timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Credit transactions table
create table if not exists credit_transactions (
    id text primary key default gen_random_uuid()::text,
    user_id text not null references users(id) on delete cascade,
    type text not null,
    amount integer not null,
    model text,
    workspace_id text,
    reason text,
    created_at timestamptz not null default now()
);

-- Workspaces table
create table if not exists workspaces (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    name text not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_opened_at timestamptz
);

-- Workspace data table
create table if not exists workspace_data (
    id text primary key default gen_random_uuid()::text,
    workspace_id text unique not null references workspaces(id) on delete cascade,
    cloudflare_url text not null,
    data_hash text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Image assets table
create table if not exists image_assets (
    id text primary key default gen_random_uuid()::text,
    workspace_id text not null references workspaces(id) on delete cascade,
    user_id text not null references users(id) on delete cascade,
    cloudflare_url text not null,
    mime_type text not null,
    metadata jsonb,
    created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_accounts_user_id on accounts(user_id);
create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_credit_transactions_user_id on credit_transactions(user_id);
create index if not exists idx_credit_transactions_reason on credit_transactions(reason);
create index if not exists idx_workspaces_user_id on workspaces(user_id);
create index if not exists idx_image_assets_user_id on image_assets(user_id);
create index if not exists idx_image_assets_workspace_id on image_assets(workspace_id);

-- RLS policies (enable RLS but allow service role to bypass)
alter table users enable row level security;
alter table accounts enable row level security;
alter table sessions enable row level security;
alter table verification_tokens enable row level security;
alter table subscriptions enable row level security;
alter table credit_balances enable row level security;
alter table credit_transactions enable row level security;
alter table workspaces enable row level security;
alter table workspace_data enable row level security;
alter table image_assets enable row level security;

-- Auto-update updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on users for each row execute function update_updated_at();
create trigger subscriptions_updated_at before update on subscriptions for each row execute function update_updated_at();
create trigger credit_balances_updated_at before update on credit_balances for each row execute function update_updated_at();
create trigger workspaces_updated_at before update on workspaces for each row execute function update_updated_at();
create trigger workspace_data_updated_at before update on workspace_data for each row execute function update_updated_at();

-- RPC function for atomic credit deduction
create or replace function deduct_credits(p_user_id text, p_amount integer)
returns integer as $$
declare
    new_balance integer;
begin
    update credit_balances
    set balance = balance - p_amount
    where user_id = p_user_id and balance >= p_amount
    returning balance into new_balance;

    return new_balance;
end;
$$ language plpgsql;

-- RPC function for atomic free generation usage
create or replace function use_free_generation(p_user_id text, p_max_free integer)
returns integer as $$
declare
    new_count integer;
begin
    update credit_balances
    set free_generations_used = free_generations_used + 1
    where user_id = p_user_id and free_generations_used < p_max_free
    returning free_generations_used into new_count;

    return new_count;
end;
$$ language plpgsql;
