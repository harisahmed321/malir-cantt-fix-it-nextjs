alter table public.subscription_plans
  add column if not exists max_ads integer;

alter table public.subscription_plans
  drop constraint if exists subscription_plans_max_ads_check;

alter table public.subscription_plans
  add constraint subscription_plans_max_ads_check
  check (max_ads is null or max_ads > 0);

update public.subscription_plans
set max_ads = case duration_days
  when 30 then 3
  when 60 then 10
  when 360 then 50
  else coalesce(max_ads, 5)
end
where max_ads is null;

insert into public.subscription_plans (name, duration_days, price, currency, max_categories, featured_listing, max_ads, is_active)
values
  ('Starter', 30, null, 'PKR', 2, false, 3, true),
  ('Growth', 60, null, 'PKR', 4, false, 10, true),
  ('Featured', 360, null, 'PKR', 8, true, 50, true)
on conflict (name) do update set
  duration_days = excluded.duration_days,
  max_categories = excluded.max_categories,
  featured_listing = excluded.featured_listing,
  max_ads = excluded.max_ads,
  is_active = true,
  updated_at = now();