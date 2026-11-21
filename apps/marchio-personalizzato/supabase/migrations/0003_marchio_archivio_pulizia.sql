-- Archivio immagini dei modelli (pubbliche: sono le grafiche del marchio)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marchio-modelli', 'marchio-modelli', true, 10485760, array['image/png','image/jpeg'])
on conflict (id) do nothing;

create policy "marchio: azienda carica nella sua cartella" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'marchio-modelli' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "marchio: azienda aggiorna nella sua cartella" on storage.objects
  for update to authenticated
  using (bucket_id = 'marchio-modelli' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "marchio: azienda cancella nella sua cartella" on storage.objects
  for delete to authenticated
  using (bucket_id = 'marchio-modelli' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Pulizia automatica ogni notte alle 3:15
create extension if not exists pg_cron;
select cron.schedule('marchio-pulizia-30-giorni', '15 3 * * *', $$select marchio_privato.pulizia()$$);

-- Valori iniziali
insert into public.marchio_impostazioni (id) values (1) on conflict (id) do nothing;
insert into public.marchio_admin (email) values ('lumiraelanorah@gmail.com') on conflict do nothing;
