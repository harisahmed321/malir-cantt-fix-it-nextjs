drop policy if exists "Customers can create bookings" on public.bookings;
drop policy if exists "Public can create phone verified bookings" on public.bookings;

create policy "Public guest booking insert"
on public.bookings
for insert
to anon, authenticated
with check (customer_id is null);