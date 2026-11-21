-- Regole della casa produttrice: foto sì/no, parole vietate; foto OPPURE messaggio;
-- la casa produttrice vede e può ritirare le etichette del proprio prodotto (senza i dati dei clienti).

alter table public.marchio_modelli
  add column if not exists consenti_foto boolean not null default true,
  add column if not exists parole_vietate text[] not null default '{}'
    check (cardinality(parole_vietate) <= 100);

alter table public.marchio_personalizzazioni
  add column if not exists con_foto boolean not null default true;

-- i dati per la pagina del cliente
drop function if exists public.marchio_modello_pubblico(text);
create function public.marchio_modello_pubblico(p_codice text)
returns table (
  id uuid, codice text, nome_prodotto text, nome_azienda text, immagine_url text,
  zona_foto jsonb, zona_dedica jsonb, zona_data jsonb,
  consenti_dedica boolean, consenti_data boolean, max_caratteri int,
  font text, colore_testo text, prezzo_cent int, suggerimento_foto text,
  larghezza_mm int, altezza_mm int, consenti_foto boolean, parole_vietate text[]
)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.codice, m.nome_prodotto, a.nome, m.immagine_url,
         m.zona_foto, m.zona_dedica, m.zona_data,
         m.consenti_dedica, m.consenti_data, m.max_caratteri,
         m.font, m.colore_testo, m.prezzo_cent, m.suggerimento_foto,
         m.larghezza_mm, m.altezza_mm, m.consenti_foto, m.parole_vietate
    from public.marchio_modelli m
    join public.marchio_aziende a on a.id = m.azienda_id
   where m.codice = p_codice and m.stato = 'pubblicato' and a.approvata;
$$;
grant execute on function public.marchio_modello_pubblico(text) to anon, authenticated;

-- creazione: ora sa se c'è la foto, e vuole foto o messaggio
drop function if exists public.marchio_crea_personalizzazione(text,text,text,text,text,text,boolean,boolean);
create function public.marchio_crea_personalizzazione(
  p_segreto text, p_codice text, p_immagine text, p_dedica text, p_data text,
  p_email text, p_consenso boolean, p_da_controllare boolean, p_con_foto boolean
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
  select mm.* into m from public.marchio_modelli mm
    join public.marchio_aziende a on a.id = mm.azienda_id
   where mm.codice = p_codice and mm.stato = 'pubblicato' and a.approvata;
  if m.id is null then
    raise exception 'Modello non disponibile';
  end if;
  if p_consenso is not true then
    raise exception 'Consenso mancante';
  end if;
  if p_immagine is null or left(p_immagine, 4) <> '/9j/' or length(p_immagine) > 4000000 then
    raise exception 'Immagine non valida';
  end if;
  if p_con_foto and not m.consenti_foto then
    raise exception 'Foto non prevista';
  end if;
  if p_dedica is not null and (not m.consenti_dedica or char_length(p_dedica) > m.max_caratteri) then
    raise exception 'Dedica non valida';
  end if;
  if not coalesce(p_con_foto, false) and nullif(trim(coalesce(p_dedica, '')), '') is null then
    raise exception 'Serve una foto o un messaggio';
  end if;
  if p_data is not null and not m.consenti_data then
    raise exception 'Data non prevista';
  end if;
  if (select count(*) from public.marchio_personalizzazioni x
       where x.modello_id = m.id and x.stato = 'bozza' and x.creata_il > now() - interval '1 hour') >= 200 then
    raise exception 'Troppe richieste';
  end if;
  return query
    insert into public.marchio_personalizzazioni as p
      (modello_id, immagine, dedica, data_testo, email, consenso, da_controllare, importo_cent, con_foto)
    values (m.id, p_immagine, nullif(trim(p_dedica), ''), nullif(trim(p_data), ''),
            lower(trim(p_email)), true, coalesce(p_da_controllare, false), m.prezzo_cent, coalesce(p_con_foto, false))
    returning p.id, p.token, p.importo_cent;
end;
$$;
grant execute on function public.marchio_crea_personalizzazione(text,text,text,text,text,text,boolean,boolean,boolean) to anon, authenticated;

-- etichette vendute del proprio prodotto, senza email dei clienti
create or replace function public.marchio_etichette_azienda(p_modello_id uuid)
returns table (id uuid, stato text, dedica text, data_testo text, con_foto boolean, da_controllare boolean, pagata_il timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.marchio_modelli m
                  where m.id = p_modello_id and (m.azienda_id = public.marchio_mia_azienda_id() or public.marchio_is_admin())) then
    raise exception 'Non autorizzato';
  end if;
  return query
    select p.id, p.stato, p.dedica, p.data_testo, p.con_foto, p.da_controllare, p.pagata_il
      from public.marchio_personalizzazioni p
     where p.modello_id = p_modello_id and p.stato in ('pagata','scaricata','rimossa')
     order by p.pagata_il desc nulls last
     limit 200;
end;
$$;
revoke execute on function public.marchio_etichette_azienda(uuid) from public, anon;
grant execute on function public.marchio_etichette_azienda(uuid) to authenticated;

create or replace function public.marchio_immagine_etichetta(p_id uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  r text;
begin
  select p.immagine into r
    from public.marchio_personalizzazioni p
    join public.marchio_modelli m on m.id = p.modello_id
   where p.id = p_id and p.stato in ('pagata','scaricata')
     and (m.azienda_id = public.marchio_mia_azienda_id() or public.marchio_is_admin());
  return r;
end;
$$;
revoke execute on function public.marchio_immagine_etichetta(uuid) from public, anon;
grant execute on function public.marchio_immagine_etichetta(uuid) to authenticated;

create or replace function public.marchio_ritira_etichetta(p_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  update public.marchio_personalizzazioni p
     set stato = 'rimossa', immagine = null, da_controllare = false
    from public.marchio_modelli m
   where p.id = p_id and m.id = p.modello_id and p.stato in ('pagata','scaricata')
     and (m.azienda_id = public.marchio_mia_azienda_id() or public.marchio_is_admin());
  return found;
end;
$$;
revoke execute on function public.marchio_ritira_etichetta(uuid) from public, anon;
grant execute on function public.marchio_ritira_etichetta(uuid) to authenticated;

-- le nuove regole fanno parte delle modifiche da approvare
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
      'consenti_foto', new.consenti_foto,
      'parole_vietate', to_jsonb(new.parole_vietate),
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
    new.consenti_foto := old.consenti_foto;
    new.parole_vietate := old.parole_vietate;
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
