-- Development seed data. Safe to run repeatedly.
-- Public provider records use user_id = null until real Supabase Auth accounts are created.

-- Keep this file runnable even when migration 003 has not been applied yet.
alter table public.provider_services
	drop constraint if exists provider_services_pkey;

alter table public.provider_services
	add column if not exists id uuid default gen_random_uuid();

update public.provider_services
set id = gen_random_uuid()
where id is null;

alter table public.provider_services
	alter column id set not null;

do $$
begin
	if not exists (
		select 1 from pg_constraint where conname = 'provider_services_pkey'
	) then
		alter table public.provider_services add constraint provider_services_pkey primary key (id);
	end if;
	if not exists (
		select 1 from pg_constraint where conname = 'provider_services_provider_category_name_key'
	) then
		alter table public.provider_services add constraint provider_services_provider_category_name_key unique (provider_id, category_id, service_name);
	end if;
end $$;

insert into public.subscription_plans (name, duration_days, price, currency, max_categories, featured_listing, max_ads)
values
	('Starter', 30, null, 'PKR', 2, false, 3),
	('Growth', 60, null, 'PKR', 4, false, 10),
	('Featured', 360, null, 'PKR', 8, true, 50)
on conflict (name) do update set
	duration_days = excluded.duration_days,
	price = excluded.price,
	max_categories = excluded.max_categories,
	featured_listing = excluded.featured_listing,
	max_ads = excluded.max_ads,
	updated_at = now();

insert into public.service_providers (
	business_name, business_slug, provider_name, phone, email, description,
	experience_years, initial_price, status, service_radius_km
)
values
	('Ahmed Plumbing Services', 'ahmed-plumbing-services', 'Ahmed Khan', '03001234567', 'ahmed.provider@example.com', 'Residential plumbing, leak detection, pipe repair, and bathroom fixture installation.', 9, 1500, 'active', 12),
	('Sana Electrical Works', 'sana-electrical-works', 'Sana Ahmed', '03011234567', 'sana.provider@example.com', 'Certified electrical troubleshooting, wiring, lighting, and backup power installation.', 7, 1800, 'active', 15),
	('Bilal Auto Care', 'bilal-auto-care', 'Bilal Raza', '03021234567', 'bilal.provider@example.com', 'Mobile car diagnostics, scheduled maintenance, battery replacement, and brake service.', 11, 2500, 'pending_verification', 20),
	('Cool Air Experts', 'cool-air-experts', 'Hamza Sheikh', '03031234567', 'hamza.provider@example.com', 'AC installation, seasonal maintenance, gas charging, and cooling system repair.', 8, 2000, 'active', 18),
	('HomeFix Appliances', 'homefix-appliances', 'Ayesha Malik', '03041234567', 'ayesha.provider@example.com', 'Reliable washing machine, refrigerator, microwave, and small appliance repairs.', 6, 1600, 'active', 14)
on conflict (business_slug) do update set
	business_name = excluded.business_name,
	provider_name = excluded.provider_name,
	phone = excluded.phone,
	email = excluded.email,
	description = excluded.description,
	experience_years = excluded.experience_years,
	initial_price = excluded.initial_price,
	status = excluded.status,
	service_radius_km = excluded.service_radius_km,
	updated_at = now();

insert into public.provider_services (provider_id, category_id, service_name, service_description, starting_price)
select sp.id, sc.id, values_data.service_name, values_data.service_description, values_data.starting_price
from (values
	('ahmed-plumbing-services', 'Plumbing', 'Leak and pipe repair', 'Fast home leak diagnosis and pipe repairs.', 1500::numeric),
	('ahmed-plumbing-services', 'Plumbing', 'Bathroom fixture installation', 'Install taps, sinks, toilets, and water fittings.', 2200::numeric),
	('sana-electrical-works', 'Electrical', 'Home electrical repair', 'Switches, sockets, breakers, and wiring faults.', 1800::numeric),
	('sana-electrical-works', 'Electrical', 'Lighting installation', 'Indoor and outdoor lighting installation.', 2000::numeric),
	('bilal-auto-care', 'Car Mechanics', 'Car diagnostics', 'On-site diagnostics and vehicle inspection.', 2500::numeric),
	('cool-air-experts', 'AC Repair', 'AC service and maintenance', 'Seasonal cleaning, inspection, and maintenance.', 2000::numeric),
	('cool-air-experts', 'AC Repair', 'AC gas charging', 'Cooling check and refrigerant charging.', 2800::numeric),
	('homefix-appliances', 'Appliance Repair', 'Refrigerator repair', 'Diagnosis and repair for home refrigerators.', 1600::numeric),
	('homefix-appliances', 'Appliance Repair', 'Washing machine repair', 'Motor, drainage, and control-panel repairs.', 1800::numeric)
) as values_data(provider_slug, category_name, service_name, service_description, starting_price)
join public.service_providers sp on sp.business_slug = values_data.provider_slug
join public.service_categories sc on sc.name = values_data.category_name
on conflict (provider_id, category_id, service_name) do update set
	service_name = excluded.service_name,
	service_description = excluded.service_description,
	starting_price = excluded.starting_price;

insert into public.provider_locations (provider_id, address, area, city, latitude, longitude, is_primary)
select sp.id, values_data.address, values_data.area, 'Karachi', values_data.latitude, values_data.longitude, true
from (values
	('ahmed-plumbing-services', 'House 12, Street 4, Malir Cantt', 'Malir Cantt', 24.8792::double precision, 67.1425::double precision),
	('sana-electrical-works', 'Shop 8, Main Korangi Road', 'Malir Halt', 24.8655::double precision, 67.1052::double precision),
	('bilal-auto-care', 'Unit 3, Auto Market', 'Model Colony', 24.8910::double precision, 67.1378::double precision),
	('cool-air-experts', 'Office 5, Main Malir Road', 'Malir City', 24.8736::double precision, 67.1164::double precision),
	('homefix-appliances', 'Shop 14, Saudabad Market', 'Saudabad', 24.8844::double precision, 67.1326::double precision)
) as values_data(provider_slug, address, area, latitude, longitude)
join public.service_providers sp on sp.business_slug = values_data.provider_slug
where not exists (
	select 1 from public.provider_locations pl where pl.provider_id = sp.id and pl.is_primary = true
);

insert into public.provider_subscriptions (provider_id, plan_id, starts_at, expires_at, status)
select sp.id, plan.id, now() - interval '12 days', now() + interval '78 days', 'active'
from public.service_providers sp
join public.subscription_plans plan on plan.name = 'Growth'
where sp.business_slug = 'ahmed-plumbing-services'
	and not exists (select 1 from public.provider_subscriptions ps where ps.provider_id = sp.id and ps.status = 'active');

insert into public.provider_subscriptions (provider_id, plan_id, starts_at, expires_at, status)
select sp.id, plan.id, now() - interval '5 days', now() + interval '25 days', 'active'
from public.service_providers sp
join public.subscription_plans plan on plan.name = 'Starter'
where sp.business_slug = 'sana-electrical-works'
	and not exists (select 1 from public.provider_subscriptions ps where ps.provider_id = sp.id and ps.status = 'active');

insert into public.payments (provider_id, subscription_id, amount, currency, method, external_reference, status, paid_at, verified_at)
select ps.provider_id, ps.id, 6000, 'PKR', 'bank_transfer', 'MOCK-PAY-0001', 'verified', now() - interval '12 days', now() - interval '11 days'
from public.provider_subscriptions ps
join public.service_providers sp on sp.id = ps.provider_id
where sp.business_slug = 'ahmed-plumbing-services'
	and not exists (select 1 from public.payments p where p.external_reference = 'MOCK-PAY-0001');

insert into public.bookings (
	reference, provider_id, category_id, customer_name, customer_phone,
	service_required, problem_description, preferred_date, preferred_time,
	service_address, latitude, longitude, status
)
select 'BK-MOCK-0001', sp.id, sc.id, 'Ali Customer', '03111234567',
	'Leak and pipe repair', 'Kitchen sink is leaking under the cabinet.', current_date + 1, '10:30',
	'Street 2, Malir Cantt', 24.8780, 67.1411, 'pending'
from public.service_providers sp, public.service_categories sc
where sp.business_slug = 'ahmed-plumbing-services' and sc.slug = 'plumbing'
on conflict (reference) do nothing;

insert into public.bookings (
	reference, provider_id, category_id, customer_name, customer_phone,
	service_required, problem_description, preferred_date, preferred_time,
	service_address, latitude, longitude, status
)
select 'BK-MOCK-0004', sp.id, sc.id, 'Nadia Customer', '03441234567',
	'Leak and pipe repair', 'Bathroom pipe was repaired quickly.', current_date - 10, '12:00',
	'Malir Cantt Block C', 24.8785, 67.1430, 'completed'
from public.service_providers sp, public.service_categories sc
where sp.business_slug = 'ahmed-plumbing-services' and sc.slug = 'plumbing'
on conflict (reference) do nothing;

insert into public.bookings (
	reference, provider_id, category_id, customer_name, customer_phone,
	service_required, problem_description, preferred_date, preferred_time,
	service_address, latitude, longitude, status
)
select 'BK-MOCK-0005', sp.id, sc.id, 'Omar Customer', '03551234567',
	'Home electrical repair', 'The team fixed a recurring breaker issue.', current_date - 7, '16:30',
	'Malir Halt Block A', 24.8660, 67.1060, 'completed'
from public.service_providers sp, public.service_categories sc
where sp.business_slug = 'sana-electrical-works' and sc.slug = 'electrical'
on conflict (reference) do nothing;

insert into public.bookings (
	reference, provider_id, category_id, customer_name, customer_phone,
	service_required, problem_description, preferred_date, preferred_time,
	service_address, latitude, longitude, status
)
select 'BK-MOCK-0006', sp.id, sc.id, 'Hina Customer', '03661234567',
	'AC service and maintenance', 'AC cooling improved after a complete service.', current_date - 6, '13:30',
	'Malir City Block D', 24.8740, 67.1170, 'completed'
from public.service_providers sp, public.service_categories sc
where sp.business_slug = 'cool-air-experts' and sc.slug = 'ac-repair'
on conflict (reference) do nothing;

insert into public.bookings (
	reference, provider_id, category_id, customer_name, customer_phone,
	service_required, problem_description, preferred_date, preferred_time,
	service_address, latitude, longitude, status
)
select 'BK-MOCK-0007', sp.id, sc.id, 'Rashid Customer', '03771234567',
	'Refrigerator repair', 'The refrigerator was repaired on the first visit.', current_date - 3, '10:00',
	'Saudabad Block A', 24.8848, 67.1320, 'completed'
from public.service_providers sp, public.service_categories sc
where sp.business_slug = 'homefix-appliances' and sc.slug = 'appliance-repair'
on conflict (reference) do nothing;

insert into public.bookings (
	reference, provider_id, category_id, customer_name, customer_phone,
	service_required, problem_description, preferred_date, preferred_time,
	service_address, latitude, longitude, status
)
select 'BK-MOCK-0002', sp.id, sc.id, 'Fatima Customer', '03221234567',
	'Lighting installation', 'Need two exterior lights installed.', current_date + 2, '15:00',
	'Block B, Malir Halt', 24.8658, 67.1058, 'accepted'
from public.service_providers sp, public.service_categories sc
where sp.business_slug = 'sana-electrical-works' and sc.slug = 'electrical'
on conflict (reference) do nothing;

insert into public.bookings (
	reference, provider_id, category_id, customer_name, customer_phone,
	service_required, problem_description, preferred_date, preferred_time,
	service_address, latitude, longitude, status
)
select 'BK-MOCK-0003', sp.id, sc.id, 'Usman Customer', '03331234567',
	'Car diagnostics', 'Car is hard to start in the morning.', current_date - 4, '11:00',
	'Model Colony Main Road', 24.8906, 67.1372, 'completed'
from public.service_providers sp, public.service_categories sc
where sp.business_slug = 'bilal-auto-care' and sc.slug = 'car-mechanics'
on conflict (reference) do nothing;

insert into public.booking_status_history (booking_id, from_status, to_status, note)
select b.id, null, b.status, 'Mock development booking status'
from public.bookings b
where b.reference in ('BK-MOCK-0001', 'BK-MOCK-0002', 'BK-MOCK-0003')
	and not exists (select 1 from public.booking_status_history h where h.booking_id = b.id);

insert into public.feedback (booking_id, provider_id, overall_rating, service_quality_rating, comment)
select b.id, b.provider_id, 5, 5, 'Arrived on time, explained the work clearly, and fixed the issue properly.'
from public.bookings b
where b.reference = 'BK-MOCK-0003'
	and not exists (select 1 from public.feedback f where f.booking_id = b.id);

insert into public.feedback (booking_id, provider_id, overall_rating, service_quality_rating, comment)
select b.id, b.provider_id, 5, 5, 'Very professional plumber. The repair was clean and the pricing was clear.'
from public.bookings b
where b.reference = 'BK-MOCK-0004'
	and not exists (select 1 from public.feedback f where f.booking_id = b.id);

insert into public.feedback (booking_id, provider_id, overall_rating, service_quality_rating, comment)
select b.id, b.provider_id, 4, 5, 'Fast response and a careful electrical repair. Would recommend.'
from public.bookings b
where b.reference = 'BK-MOCK-0005'
	and not exists (select 1 from public.feedback f where f.booking_id = b.id);

insert into public.feedback (booking_id, provider_id, overall_rating, service_quality_rating, comment)
select b.id, b.provider_id, 5, 4, 'The AC service was thorough and the technician explained the maintenance clearly.'
from public.bookings b
where b.reference = 'BK-MOCK-0006'
	and not exists (select 1 from public.feedback f where f.booking_id = b.id);

insert into public.feedback (booking_id, provider_id, overall_rating, service_quality_rating, comment)
select b.id, b.provider_id, 4, 4, 'Friendly appliance technician and the refrigerator is working well again.'
from public.bookings b
where b.reference = 'BK-MOCK-0007'
	and not exists (select 1 from public.feedback f where f.booking_id = b.id);

insert into public.provider_documents (provider_id, document_type, storage_path, review_status, reviewed_at)
select sp.id, 'business_registration', 'mock/provider-documents/' || sp.business_slug || '/registration.pdf',
	case when sp.status = 'active' then 'approved' else 'pending' end,
	case when sp.status = 'active' then now() - interval '20 days' else null end
from public.service_providers sp
where not exists (
	select 1 from public.provider_documents pd
	where pd.provider_id = sp.id and pd.document_type = 'business_registration'
);

insert into public.notifications (recipient_id, channel, event_type, payload, sent_at)
select null, 'in_app', 'provider_registration_received', jsonb_build_object('provider', sp.business_name, 'status', sp.status), null
from public.service_providers sp
where sp.status = 'pending_verification'
	and not exists (
		select 1 from public.notifications n
		where n.event_type = 'provider_registration_received'
			and n.payload ->> 'provider' = sp.business_name
	);

insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
select null, 'mock_seeded', 'service_provider', sp.id, jsonb_build_object('source', 'development seed')
from public.service_providers sp
where not exists (
	select 1 from public.audit_logs al
	where al.action = 'mock_seeded' and al.entity_type = 'service_provider' and al.entity_id = sp.id
);

insert into public.platform_settings (key, value)
values
	('platform_name', '{"value":"Malir Cantt Fix It"}'::jsonb),
	('default_currency', '{"value":"PKR"}'::jsonb),
	('demo_mode', '{"value":true}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
