-- Dati del modello pubblicato per la pagina del cliente (con il nome del marchio)
create or replace function public.marchio_modello_pubblico(p_codice text)
returns table (
  id uuid, codice text, nome_prodotto text, nome_azienda text, immagine_url text,
  zona_foto jsonb, zona_dedica jsonb, zona_data jsonb,
  consenti_dedica boolean, consenti_data boolean, max_caratteri int,
  font text, colore_testo text, prezzo_cent int
)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.codice, m.nome_prodotto, a.nome, m.immagine_url,
         m.zona_foto, m.zona_dedica, m.zona_data,
         m.consenti_dedica, m.consenti_data, m.max_caratteri,
         m.font, m.colore_testo, m.prezzo_cent
    from public.marchio_modelli m
    join public.marchio_aziende a on a.id = m.azienda_id
   where m.codice = p_codice and m.stato = 'pubblicato';
$$;
grant execute on function public.marchio_modello_pubblico(text) to anon, authenticated;

-- Marchio e modello di prova (prodotto inventato)
insert into public.marchio_aziende (id, user_id, nome, email, approvata)
values ('00000000-0000-4000-8000-000000000001', null, 'Marchio Prova', null, true)
on conflict (id) do nothing;

insert into public.marchio_modelli (
  azienda_id, codice, nome_prodotto, immagine_url,
  zona_foto, zona_dedica, zona_data,
  consenti_dedica, consenti_data, max_caratteri, font, colore_testo, prezzo_cent, stato
) values (
  '00000000-0000-4000-8000-000000000001', 'prova', 'Panettone della Casa', '/modelli/prova.jpg',
  '{"x":0.0815,"y":0.2405,"w":0.3578,"h":0.5434}',
  '{"x":0.4872,"y":0.3786,"w":0.4313,"h":0.2339}',
  '{"x":0.4872,"y":0.6514,"w":0.4313,"h":0.0891}',
  true, true, 60, 'corsivo', '#7a1f2b', 299, 'pubblicato'
) on conflict (codice) do nothing;
