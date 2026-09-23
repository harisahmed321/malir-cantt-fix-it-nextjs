alter table public.provider_services
  drop constraint if exists provider_services_pkey;

alter table public.provider_services
  add column if not exists id uuid default gen_random_uuid();

update public.provider_services
set id = gen_random_uuid()
where id is null;

alter table public.provider_services
  alter column id set not null;

alter table public.provider_services
  add constraint provider_services_pkey primary key (id);

alter table public.provider_services
  add constraint provider_services_provider_category_name_key unique (provider_id, category_id, service_name);