create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.provider_status as enum ('pending_verification', 'under_review', 'approved', 'active', 'suspended', 'rejected', 'expired');
create type public.booking_status as enum ('pending', 'accepted', 'rejected', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired');
create type public.payment_status as enum ('pending', 'verified', 'failed', 'refunded');

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.customers (
  id uuid primary key references public.profiles(id) on delete cascade,
  preferred_area text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  slug text not null unique,
  description text,
  icon_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  business_name text not null,
  business_slug text not null unique,
  provider_name text not null,
  phone text not null,
  email citext,
  description text,
  experience_years integer check (experience_years is null or experience_years >= 0),
  initial_price numeric(12, 2) check (initial_price is null or initial_price >= 0),
  currency text not null default 'PKR',
  status public.provider_status not null default 'pending_verification',
  profile_image_url text,
  verification_notes text,
  rejection_reason text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  service_radius_km numeric(8, 2) check (service_radius_km is null or service_radius_km >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_services (
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete restrict,
  service_name text,
  service_description text,
  starting_price numeric(12, 2) check (starting_price is null or starting_price >= 0),
  created_at timestamptz not null default now(),
  primary key (provider_id, category_id)
);

create table public.provider_locations (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  address text not null,
  area text not null,
  city text not null default 'Karachi',
  latitude double precision not null,
  longitude double precision not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  check (latitude between -90 and 90),
  check (longitude between -180 and 180)
);

create table public.provider_documents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  duration_days integer not null check (duration_days > 0),
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'PKR',
  max_categories integer check (max_categories is null or max_categories > 0),
  featured_listing boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_subscriptions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete restrict,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'cancelled')),
  activated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete restrict,
  subscription_id uuid references public.provider_subscriptions(id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'PKR',
  method text,
  external_reference text,
  status public.payment_status not null default 'pending',
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('BK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_id uuid references public.customers(id) on delete set null,
  provider_id uuid not null references public.service_providers(id) on delete restrict,
  category_id uuid references public.service_categories(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  service_required text not null,
  problem_description text,
  preferred_date date,
  preferred_time time,
  service_address text not null,
  latitude double precision,
  longitude double precision,
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  changed_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create table public.feedback_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  provider_id uuid not null references public.service_providers(id) on delete restrict,
  overall_rating smallint not null check (overall_rating between 1 and 5),
  service_quality_rating smallint check (service_quality_rating is null or service_quality_rating between 1 and 5),
  comment text,
  is_moderated boolean not null default false,
  moderation_note text,
  created_at timestamptz not null default now()
);

create table public.feedback_images (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'push', 'in_app')),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create index service_providers_status_idx on public.service_providers(status);
create index provider_services_category_idx on public.provider_services(category_id);
create index provider_locations_provider_idx on public.provider_locations(provider_id);
create index provider_locations_coordinates_idx on public.provider_locations(latitude, longitude);
create index bookings_status_idx on public.bookings(status);
create index bookings_provider_idx on public.bookings(provider_id);
create index bookings_customer_idx on public.bookings(customer_id);
create index bookings_created_at_idx on public.bookings(created_at desc);
create index feedback_provider_idx on public.feedback(provider_id);
create index subscriptions_expiry_idx on public.provider_subscriptions(expires_at);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.service_categories enable row level security;
alter table public.service_providers enable row level security;
alter table public.provider_services enable row level security;
alter table public.provider_locations enable row level security;
alter table public.bookings enable row level security;
alter table public.feedback enable row level security;
alter table public.feedback_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.has_permission(permission_name text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid() and p.name = permission_name
  );
$$;

create policy "Public can view active categories"
on public.service_categories for select using (is_active = true);

create policy "Public can view active providers"
on public.service_providers for select using (status = 'active');

create policy "Public can view provider services"
on public.provider_services for select using (
  exists (select 1 from public.service_providers sp where sp.id = provider_id and sp.status = 'active')
);

create policy "Public can view provider locations"
on public.provider_locations for select using (
  exists (select 1 from public.service_providers sp where sp.id = provider_id and sp.status = 'active')
);

create policy "Users can view own profile"
on public.profiles for select using (id = auth.uid() or public.has_permission('profiles.read'));

create policy "Users can update own profile"
on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Customers can view own bookings"
on public.bookings for select using (customer_id = auth.uid() or public.has_permission('bookings.read'));

create policy "Customers can create bookings"
on public.bookings for insert with check (customer_id is null or customer_id = auth.uid());

create policy "Providers can view assigned bookings"
on public.bookings for select using (
  exists (select 1 from public.service_providers sp where sp.id = provider_id and sp.user_id = auth.uid())
  or public.has_permission('bookings.read')
);

create policy "Customers can view own feedback"
on public.feedback for select using (
  exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
  or public.has_permission('feedback.read')
);

create policy "Admins can manage providers"
on public.service_providers for all using (public.has_permission('providers.manage')) with check (public.has_permission('providers.manage'));

create policy "Admins can manage categories"
on public.service_categories for all using (public.has_permission('categories.manage')) with check (public.has_permission('categories.manage'));

create policy "Admins can read audit logs"
on public.audit_logs for select using (public.has_permission('audit.read'));

insert into public.roles (name, description) values
  ('customer', 'Can browse providers and manage own bookings'),
  ('provider', 'Can manage an approved provider profile and assigned bookings'),
  ('admin', 'Can manage authorized platform operations')
on conflict (name) do nothing;

insert into public.permissions (name, description) values
  ('profiles.read', 'Read protected profiles'),
  ('providers.manage', 'Manage provider applications and profiles'),
  ('categories.manage', 'Manage service categories'),
  ('bookings.read', 'Read platform bookings'),
  ('feedback.read', 'Read feedback'),
  ('audit.read', 'Read audit history')
on conflict (name) do nothing;

insert into public.service_categories (name, slug, description) values
  ('Plumbing', 'plumbing', 'Pipe repair, leaks, fixtures, and water systems'),
  ('Electrical', 'electrical', 'Wiring, electrical faults, fixtures, and installations'),
  ('Car Mechanics', 'car-mechanics', 'Vehicle diagnostics, maintenance, and repairs'),
  ('AC Repair', 'ac-repair', 'Air conditioning service, repair, and installation'),
  ('Appliance Repair', 'appliance-repair', 'Home appliance diagnosis and repairs')
on conflict (slug) do nothing;
