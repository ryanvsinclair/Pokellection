-- Reservations must be tied to a signed-in shopper (no anonymous holds).

drop policy if exists "Anyone can create reservations" on public.reservations;

create policy "Authenticated users can create reservations"
  on public.reservations
  for insert
  with check (auth.uid() is not null);
