-- Formato dell'adesivo per modello (misura finita in mm)
alter table public.marchio_modelli
  add column if not exists larghezza_mm int not null default 100,
  add column if not exists altezza_mm int not null default 70;
alter table public.marchio_modelli drop constraint if exists marchio_modelli_formato_check;
alter table public.marchio_modelli add constraint marchio_modelli_formato_check
  check ((larghezza_mm, altezza_mm) in ((100,70),(70,100),(80,100),(90,90)));

drop function if exists public.marchio_modello_pubblico(text);
create function public.marchio_modello_pubblico(p_codice text)
returns table (
  id uuid, codice text, nome_prodotto text, nome_azienda text, immagine_url text,
  zona_foto jsonb, zona_dedica jsonb, zona_data jsonb,
  consenti_dedica boolean, consenti_data boolean, max_caratteri int,
  font text, colore_testo text, prezzo_cent int, suggerimento_foto text,
  larghezza_mm int, altezza_mm int
)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.codice, m.nome_prodotto, a.nome, m.immagine_url,
         m.zona_foto, m.zona_dedica, m.zona_data,
         m.consenti_dedica, m.consenti_data, m.max_caratteri,
         m.font, m.colore_testo, m.prezzo_cent, m.suggerimento_foto,
         m.larghezza_mm, m.altezza_mm
    from public.marchio_modelli m
    join public.marchio_aziende a on a.id = m.azienda_id
   where m.codice = p_codice and m.stato = 'pubblicato' and a.approvata;
$$;
grant execute on function public.marchio_modello_pubblico(text) to anon, authenticated;

drop function if exists public.marchio_leggi_personalizzazione(text, uuid, text, boolean);
create function public.marchio_leggi_personalizzazione(
  p_segreto text, p_id uuid, p_token text, p_con_immagine boolean
)
returns table (
  stato text, immagine text, email text, importo_cent int,
  nome_prodotto text, codice text, nome_azienda text, pagata_il timestamptz,
  larghezza_mm int, altezza_mm int
)
language plpgsql security definer set search_path = ''
as $$
begin
  if not marchio_privato.segreto_valido(p_segreto) then
    raise exception 'Non autorizzato';
  end if;
  return query
    select p.stato,
           case when p_con_immagine and p.stato in ('pagata','scaricata') then p.immagine else null end,
           p.email, p.importo_cent, m.nome_prodotto, m.codice, a.nome, p.pagata_il,
           m.larghezza_mm, m.altezza_mm
      from public.marchio_personalizzazioni p
      join public.marchio_modelli m on m.id = p.modello_id
      join public.marchio_aziende a on a.id = m.azienda_id
     where p.id = p_id and p.token = p_token;
end;
$$;
grant execute on function public.marchio_leggi_personalizzazione(text,uuid,text,boolean) to anon, authenticated;

-- il formato fa parte delle modifiche da approvare
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
      'suggerimento_foto', new.suggerimento_foto,
      'larghezza_mm', new.larghezza_mm,
      'altezza_mm', new.altezza_mm
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
    new.larghezza_mm := old.larghezza_mm;
    new.altezza_mm := old.altezza_mm;
    new.stato := 'pubblicato';
    return new;
  end if;
  if new.stato not in ('bozza','in_revisione') then
    raise exception 'Solo l''amministratore può pubblicare un modello';
  end if;
  return new;
end;
$$;

-- Terzo modello di prova: whisky in formato verticale 8 × 10 cm (marchio inventato)
insert into public.marchio_modelli (
  azienda_id, codice, nome_prodotto, immagine_url, larghezza_mm, altezza_mm,
  zona_foto, zona_dedica, zona_data,
  consenti_dedica, consenti_data, max_caratteri, font, colore_testo, prezzo_cent, stato, suggerimento_foto
) values (
  '00000000-0000-4000-8000-000000000001', 'whisky', 'Whisky di Famiglia', '/modelli/whisky.jpg', 80, 100,
  '{"x":0.1476,"y":0.2700,"w":0.7047,"h":0.4393}',
  '{"x":0.1280,"y":0.7308,"w":0.7441,"h":0.0599}',
  '{"x":0.2953,"y":0.8051,"w":0.4094,"h":0.0288}',
  true, true, 40, 'serif', '#5e1820', 299, 'pubblicato',
  'Scegli una foto in cui alzi il bicchiere: sarai tu il protagonista al centro dell''etichetta!'
) on conflict (codice) do nothing;
