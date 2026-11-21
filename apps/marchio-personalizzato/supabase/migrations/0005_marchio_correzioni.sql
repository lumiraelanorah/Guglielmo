-- Correzioni dopo il controllo indipendente

-- 1) Le modifiche a un modello pubblicato restano "in attesa": la versione online non cambia
--    (e il QR continua a funzionare) finché l'amministratore non le approva.
alter table public.marchio_modelli add column if not exists modifiche_in_attesa jsonb;

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
    -- salva la proposta e lascia online la versione approvata
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
      'colore_testo', new.colore_testo
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
    new.stato := 'pubblicato';
    return new;
  end if;
  if new.stato not in ('bozza','in_revisione') then
    raise exception 'Solo l''amministratore può pubblicare un modello';
  end if;
  return new;
end;
$$;

-- Alla creazione l'azienda non sceglie prezzo, codice, note.
create or replace function marchio_privato.modelli_nuovo()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.marchio_is_admin() or auth.uid() is null then
    return new;
  end if;
  new.prezzo_cent := 299;
  new.codice := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  new.nota_admin := null;
  new.modifiche_in_attesa := null;
  new.stato := 'bozza';
  return new;
end;
$$;
drop trigger if exists marchio_modelli_nuovo on public.marchio_modelli;
create trigger marchio_modelli_nuovo
  before insert on public.marchio_modelli
  for each row execute function marchio_privato.modelli_nuovo();

-- 2) Un modello con etichette ancora scaricabili non si può eliminare
alter table public.marchio_personalizzazioni drop constraint if exists marchio_personalizzazioni_modello_id_fkey;
alter table public.marchio_personalizzazioni
  add constraint marchio_personalizzazioni_modello_id_fkey
  foreign key (modello_id) references public.marchio_modelli(id) on delete restrict;

drop policy if exists "azienda o admin cancella" on public.marchio_modelli;
create policy "azienda o admin cancella" on public.marchio_modelli
  for delete to authenticated
  using (
    public.marchio_is_admin()
    or (azienda_id = (select public.marchio_mia_azienda_id()) and stato <> 'pubblicato')
  );

-- le bozze non pagate non devono bloccare: si cancellano con il modello
create or replace function marchio_privato.modelli_pulisci_bozze()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.marchio_personalizzazioni where modello_id = old.id and stato = 'bozza';
  return old;
end;
$$;
drop trigger if exists marchio_modelli_pulisci_bozze on public.marchio_modelli;
create trigger marchio_modelli_pulisci_bozze
  before delete on public.marchio_modelli
  for each row execute function marchio_privato.modelli_pulisci_bozze();

-- 3) Un'azienda revocata non vende più
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
   where m.codice = p_codice and m.stato = 'pubblicato' and a.approvata;
$$;

create or replace function public.marchio_crea_personalizzazione(
  p_segreto text, p_codice text, p_immagine text, p_dedica text, p_data text,
  p_email text, p_consenso boolean, p_da_controllare boolean
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
  if p_dedica is not null and (not m.consenti_dedica or char_length(p_dedica) > m.max_caratteri) then
    raise exception 'Dedica non valida';
  end if;
  if p_data is not null and not m.consenti_data then
    raise exception 'Data non prevista';
  end if;
  -- freno agli abusi: al massimo 200 bozze all'ora per modello
  if (select count(*) from public.marchio_personalizzazioni x
       where x.modello_id = m.id and x.stato = 'bozza' and x.creata_il > now() - interval '1 hour') >= 200 then
    raise exception 'Troppe richieste';
  end if;
  return query
    insert into public.marchio_personalizzazioni as p
      (modello_id, immagine, dedica, data_testo, email, consenso, da_controllare, importo_cent)
    values (m.id, p_immagine, nullif(trim(p_dedica), ''), nullif(trim(p_data), ''),
            lower(trim(p_email)), true, coalesce(p_da_controllare, false), m.prezzo_cent)
    returning p.id, p.token, p.importo_cent;
end;
$$;

-- 4) Le bozze si conservano 3 giorni (margine per pagamenti confermati in ritardo)
create or replace function marchio_privato.pulizia()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.marchio_personalizzazioni where stato <> 'bozza' and creata_il < now() - interval '30 days';
  delete from public.marchio_personalizzazioni where stato = 'bozza' and creata_il < now() - interval '3 days';
  update public.marchio_ordini set email = null where email is not null and creato_il < now() - interval '30 days';
end;
$$;
