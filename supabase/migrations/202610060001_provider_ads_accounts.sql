create table if not exists public.customer_profiles (
  phone text primary key check (phone ~ '^03[0-9]{9}$'),
  full_name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_providers
  add column if not exists owner_phone text;

create unique index if not exists service_providers_owner_phone_unique
  on public.service_providers(owner_phone)
  where owner_phone is not null;

alter table public.provider_subscriptions
  alter column starts_at drop not null,
  alter column expires_at drop not null;

alter table public.provider_subscriptions
  drop constraint if exists provider_subscriptions_status_check;

alter table public.provider_subscriptions
  add constraint provider_subscriptions_status_check
  check (status in ('pending', 'active', 'expired', 'cancelled', 'rejected'));

create table if not exists public.service_ads (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete restrict,
  title text not null,
  description text not null,
  base_price numeric(12, 2) not null check (base_price >= 0),
  currency text not null default 'PKR',
  status text not null default 'pending_subscription'
    check (status in ('draft', 'pending_subscription', 'active', 'paused', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_ads_provider_idx on public.service_ads(provider_id);
create index if not exists service_ads_category_status_idx on public.service_ads(category_id, status);
create index if not exists provider_subscriptions_provider_status_idx on public.provider_subscriptions(provider_id, status);

alter table public.customer_profiles enable row level security;
alter table public.service_ads enable row level security;

-- All writes and private reads are performed by server APIs after checking the phone OTP cookie
-- or Supabase admin session. Public discovery is exposed only through the server API.