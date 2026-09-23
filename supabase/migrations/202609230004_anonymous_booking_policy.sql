drop policy if exists "Customers can create bookings" on public.bookings;

create policy "Public can create phone verified bookings"
on public.bookings for insert
to anon, authenticated
with check (customer_id is null or customer_id = auth.uid());