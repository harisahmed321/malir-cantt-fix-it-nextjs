create policy "Public can view reviews for active providers"
on public.feedback for select using (
  exists (
    select 1
    from public.service_providers sp
    where sp.id = provider_id and sp.status = 'active'
  )
);