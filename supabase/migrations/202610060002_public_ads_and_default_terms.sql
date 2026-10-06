alter table public.subscription_plans
  alter column price drop not null;

drop policy if exists "Public can view active service ads" on public.service_ads;
create policy "Public can view active service ads"
on public.service_ads for select
to anon, authenticated
using (status = 'active');

insert into public.subscription_plans (name, duration_days, price, currency, is_active)
values
  ('Starter', 30, null, 'PKR', true),
  ('Growth', 60, null, 'PKR', true),
  ('Featured', 360, null, 'PKR', true)
on conflict (name) do update set
  duration_days = excluded.duration_days,
  price = excluded.price,
  currency = excluded.currency,
  is_active = true,
  updated_at = now();