-- Funzioni chiamate dal sito (lato server, con segreto) e statistiche

create or replace function public.marchio_registra_evento(p_codice text, p_tipo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_tipo not in ('scansione','anteprima') then
    raise exception 'Tipo evento non valido';
  end if;
  select m.id into v_id from public.marchio_modelli m
   where m.codice = p_codice and m.stato = 'pubblicato';
  if v_id is not null then
    insert into public.marchio_eventi (modello_id, tipo) values (v_id, p_tipo);
  end if;
end;
$$;
grant execute on function public.marchio_registra_evento(text, text) to anon, authenticated;

create or replace function public.marchio_crea_personalizzazione(
  p_segreto text,
  p_codice text,
  p_immagine text,
  p_dedica text,
  p_data text,
  p_email text,
  p_consenso boolean,
  p_da_controllare boolean
)
returns table (id uuid, token text, importo_cent int)
language plpgsql security definer set search_path = ''
as $$
declare
  m public.marchio_modelli;
begin
  if not marchio_privato.segreto_valido(p_segreto) then
    raise exception 'Non autorizzato';
  end if;
  select * into m from public.marchio_modelli mm
   where mm.codice = p_codice and mm.stato = 'pubblicato';
  if m.id is null then
    raise exception 'Modello non disponibile';
  end if;
  if p_consenso is not true then
    raise exception 'Consenso mancante';
  end if;
  if p_immagine is null or left(p_immagine, 4) <> '/9j/' or length(p_immagine) > 4000000 then
    raise exception 'Immagine non valida';
  end if;
  if p_dedica is not null and (not m.consenti_dedica or char_length(p_dedica) > m.max_caratteri) then
    raise exception 'Dedica non valida';
  end if;
  if p_data is not null and not m.consenti_data then
    raise exception 'Data non prevista';
  end if;
  return query
    insert into public.marchio_personalizzazioni as p
      (modello_id, immagine, dedica, data_testo, email, consenso, da_controllare, importo_cent)
    values (m.id, p_immagine, nullif(trim(p_dedica), ''), nullif(trim(p_data), ''),
            lower(trim(p_email)), true, coalesce(p_da_controllare, false), m.prezzo_cent)
    returning p.id, p.token, p.importo_cent;
end;
$$;
grant execute on function public.marchio_crea_personalizzazione(text,text,text,text,text,text,boolean,boolean) to anon, authenticated;

-- Restituisce 'nuova' se il pagamento è appena stato registrato, 'gia' se lo era già.
create or replace function public.marchio_segna_pagata(
  p_segreto text, p_id uuid, p_token text, p_metodo text, p_riferimento text
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  p public.marchio_personalizzazioni;
begin
  if not marchio_privato.segreto_valido(p_segreto) then
    raise exception 'Non autorizzato';
  end if;
  select * into p from public.marchio_personalizzazioni x
   where x.id = p_id and x.token = p_token
   for update;
  if p.id is null then
    raise exception 'Etichetta non trovata';
  end if;
  if p.stato in ('pagata','scaricata') then
    return 'gia';
  end if;
  if p.stato <> 'bozza' then
    raise exception 'Etichetta non disponibile';
  end if;
  update public.marchio_personalizzazioni set stato = 'pagata', pagata_il = now() where id = p.id;
  insert into public.marchio_ordini (personalizzazione_id, modello_id, importo_cent, email, metodo, riferimento)
  values (p.id, p.modello_id, p.importo_cent, p.email, p_metodo, p_riferimento)
  on conflict (personalizzazione_id) do nothing;
  insert into public.marchio_eventi (modello_id, tipo) values (p.modello_id, 'acquisto');
  return 'nuova';
end;
$$;
grant execute on function public.marchio_segna_pagata(text,uuid,text,text,text) to anon, authenticated;

create or replace function public.marchio_leggi_personalizzazione(
  p_segreto text, p_id uuid, p_token text, p_con_immagine boolean
)
returns table (
  stato text, immagine text, email text, importo_cent int,
  nome_prodotto text, codice text, nome_azienda text, pagata_il timestamptz
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
           p.email, p.importo_cent, m.nome_prodotto, m.codice, a.nome, p.pagata_il
      from public.marchio_personalizzazioni p
      join public.marchio_modelli m on m.id = p.modello_id
      join public.marchio_aziende a on a.id = m.azienda_id
     where p.id = p_id and p.token = p_token;
end;
$$;
grant execute on function public.marchio_leggi_personalizzazione(text,uuid,text,boolean) to anon, authenticated;

create or replace function public.marchio_segna_scaricata(p_segreto text, p_id uuid, p_token text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not marchio_privato.segreto_valido(p_segreto) then
    raise exception 'Non autorizzato';
  end if;
  update public.marchio_personalizzazioni
     set stato = 'scaricata', scaricata_il = coalesce(scaricata_il, now())
   where id = p_id and token = p_token and stato in ('pagata','scaricata');
end;
$$;
grant execute on function public.marchio_segna_scaricata(text,uuid,text) to anon, authenticated;

-- Statistiche per l'azienda proprietaria (o admin)
create or replace function public.marchio_statistiche(p_modello_id uuid)
returns table (scansioni bigint, anteprime bigint, acquisti bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.marchio_modelli m
     where m.id = p_modello_id
       and (m.azienda_id = public.marchio_mia_azienda_id() or public.marchio_is_admin())
  ) then
    raise exception 'Non autorizzato';
  end if;
  return query
    select count(*) filter (where e.tipo = 'scansione'),
           count(*) filter (where e.tipo = 'anteprima'),
           count(*) filter (where e.tipo = 'acquisto')
      from public.marchio_eventi e
     where e.modello_id = p_modello_id;
end;
$$;
revoke execute on function public.marchio_statistiche(uuid) from public, anon;
grant execute on function public.marchio_statistiche(uuid) to authenticated;

-- Pulizia: etichette e foto cancellate dopo 30 giorni, bozze non pagate dopo 2 giorni
create or replace function marchio_privato.pulizia()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.marchio_personalizzazioni where creata_il < now() - interval '30 days';
  delete from public.marchio_personalizzazioni where stato = 'bozza' and creata_il < now() - interval '2 days';
  update public.marchio_ordini set email = null where email is not null and creato_il < now() - interval '30 days';
end;
$$;
