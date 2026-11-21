-- Consiglio per la foto (es. "con una birra in mano") e secondo modello di prova: la birra

alter table public.marchio_modelli add column if not exists suggerimento_foto text
  check (suggerimento_foto is null or char_length(suggerimento_foto) <= 140);

drop function if exists public.marchio_modello_pubblico(text);
create function public.marchio_modello_pubblico(p_codice text)
returns table (
  id uuid, codice text, nome_prodotto text, nome_azienda text, immagine_url text,
  zona_foto jsonb, zona_dedica jsonb, zona_data jsonb,
  consenti_dedica boolean, consenti_data boolean, max_caratteri int,
  font text, colore_testo text, prezzo_cent int, suggerimento_foto text
)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.codice, m.nome_prodotto, a.nome, m.immagine_url,
         m.zona_foto, m.zona_dedica, m.zona_data,
         m.consenti_dedica, m.consenti_data, m.max_caratteri,
         m.font, m.colore_testo, m.prezzo_cent, m.suggerimento_foto
    from public.marchio_modelli m
    join public.marchio_aziende a on a.id = m.azienda_id
   where m.codice = p_codice and m.stato = 'pubblicato' and a.approvata;
$$;
grant execute on function public.marchio_modello_pubblico(text) to anon, authenticated;

-- il consiglio fa parte delle modifiche che l'admin deve approvare
create or replace function marchio_privato.modelli_protezione()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.aggiornato_il := now();
  if public.marchio_is_admin() or auth.uid() is null then
    return new;
  end if;
  new.prezzo_cent := old.prezzo_cent;
  new.codice := old.codice;
  new.azienda_id := old.azienda_id;
  new.nota_admin := old.nota_admin;
  new.modifiche_in_attesa := old.modifiche_in_attesa;
  if old.stato = 'pubblicato' then
    new.modifiche_in_attesa := jsonb_build_object(
      'nome_prodotto', new.nome_prodotto,
      'immagine_url', new.immagine_url,
      'zona_foto', new.zona_foto,
      'zona_dedica', new.zona_dedica,
      'zona_data', new.zona_data,
      'consenti_dedica', new.consenti_dedica,
      'consenti_data', new.consenti_data,
      'max_caratteri', new.max_caratteri,
      'font', new.font,
      'colore_testo', new.colore_testo,
      'suggerimento_foto', new.suggerimento_foto
    );
    new.nome_prodotto := old.nome_prodotto;
    new.immagine_url := old.immagine_url;
    new.zona_foto := old.zona_foto;
    new.zona_dedica := old.zona_dedica;
    new.zona_data := old.zona_data;
    new.consenti_dedica := old.consenti_dedica;
    new.consenti_data := old.consenti_data;
    new.max_caratteri := old.max_caratteri;
    new.font := old.font;
    new.colore_testo := old.colore_testo;
    new.suggerimento_foto := old.suggerimento_foto;
    new.stato := 'pubblicato';
    return new;
  end if;
  if new.stato not in ('bozza','in_revisione') then
    raise exception 'Solo l''amministratore può pubblicare un modello';
  end if;
  return new;
end;
$$;

insert into public.marchio_modelli (
  azienda_id, codice, nome_prodotto, immagine_url,
  zona_foto, zona_dedica, zona_data,
  consenti_dedica, consenti_data, max_caratteri, font, colore_testo, prezzo_cent, stato, suggerimento_foto
) values (
  '00000000-0000-4000-8000-000000000001', 'birra', 'Birra della Casa', '/modelli/birra.jpg',
  '{"x":0.3291,"y":0.2361,"w":0.3419,"h":0.5033,"forma":"ovale"}',
  '{"x":0.3355,"y":0.7661,"w":0.3291,"h":0.0601}',
  '{"x":0.3994,"y":0.8307,"w":0.2013,"h":0.0301}',
  true, true, 30, 'serif', '#5a1f0e', 299, 'pubblicato',
  'Scegli una foto in cui alzi una birra: sarai tu il protagonista al centro dell''etichetta!'
) on conflict (codice) do nothing;
