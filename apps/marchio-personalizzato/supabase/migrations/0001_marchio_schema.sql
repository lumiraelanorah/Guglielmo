-- Marchio personalizzato: schema di base (prefisso marchio_)

create schema if not exists marchio_privato;
revoke all on schema marchio_privato from public, anon, authenticated;

create table if not exists marchio_privato.segreti (
  nome text primary key,
  valore text not null
);
revoke all on marchio_privato.segreti from public, anon, authenticated;

create or replace function marchio_privato.segreto_valido(p_segreto text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from marchio_privato.segreti s
    where s.nome = 'server' and p_segreto is not null and s.valore = p_segreto
  );
$$;

-- Amministratori ---------------------------------------------------------
create table public.marchio_admin (
  email text primary key check (email = lower(email)),
  aggiunto_il timestamptz not null default now()
);
alter table public.marchio_admin enable row level security;

create or replace function public.marchio_is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.marchio_admin a on a.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;

create policy "admin vede admin" on public.marchio_admin
  for select to authenticated using (public.marchio_is_admin());
create policy "admin aggiunge admin" on public.marchio_admin
  for insert to authenticated with check (public.marchio_is_admin());
create policy "admin toglie admin" on public.marchio_admin
  for delete to authenticated using (public.marchio_is_admin());

-- Impostazioni (tema) ------------------------------------------------------
create table public.marchio_impostazioni (
  id int primary key default 1 check (id = 1),
  tema_manuale text check (tema_manuale in ('natale','sanvalentino','pasqua','regalo')),
  calendario jsonb not null default '[
    {"tema":"sanvalentino","dal":"01-01"},
    {"tema":"pasqua","dal":"03-01"},
    {"tema":"regalo","dal":"07-01"},
    {"tema":"natale","dal":"11-01"}
  ]'::jsonb,
  aggiornato_il timestamptz not null default now()
);
alter table public.marchio_impostazioni enable row level security;
create policy "tutti leggono impostazioni" on public.marchio_impostazioni
  for select to anon, authenticated using (true);
create policy "admin modifica impostazioni" on public.marchio_impostazioni
  for update to authenticated using (public.marchio_is_admin()) with check (public.marchio_is_admin());

-- Aziende ------------------------------------------------------------------
create table public.marchio_aziende (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  nome text not null check (char_length(nome) between 2 and 80),
  email text,
  approvata boolean not null default false,
  creata_il timestamptz not null default now()
);
alter table public.marchio_aziende enable row level security;
create policy "azienda vede se stessa, admin tutte" on public.marchio_aziende
  for select to authenticated using (user_id = (select auth.uid()) or public.marchio_is_admin());
create policy "admin modifica aziende" on public.marchio_aziende
  for update to authenticated using (public.marchio_is_admin()) with check (public.marchio_is_admin());

create or replace function public.marchio_mia_azienda_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select a.id from public.marchio_aziende a where a.user_id = auth.uid();
$$;

create or replace function public.marchio_registra_azienda(p_nome text)
returns public.marchio_aziende
language plpgsql security definer set search_path = ''
as $$
declare
  r public.marchio_aziende;
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto';
  end if;
  insert into public.marchio_aziende (user_id, nome, email)
  values (auth.uid(), trim(p_nome), lower(auth.jwt() ->> 'email'))
  on conflict (user_id) do update set nome = excluded.nome
  returning * into r;
  return r;
end;
$$;
revoke execute on function public.marchio_registra_azienda(text) from public, anon;
grant execute on function public.marchio_registra_azienda(text) to authenticated;

-- Modelli ------------------------------------------------------------------
create table public.marchio_modelli (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.marchio_aziende(id) on delete cascade,
  codice text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  nome_prodotto text not null check (char_length(nome_prodotto) between 2 and 80),
  immagine_url text,
  zona_foto jsonb,
  zona_dedica jsonb,
  zona_data jsonb,
  consenti_dedica boolean not null default true,
  consenti_data boolean not null default true,
  max_caratteri int not null default 60 check (max_caratteri between 5 and 60),
  font text not null default 'serif' check (font in ('serif','corsivo','semplice')),
  colore_testo text not null default '#5a1a1a' check (colore_testo ~ '^#[0-9a-fA-F]{6}$'),
  prezzo_cent int not null default 299 check (prezzo_cent between 50 and 5000),
  stato text not null default 'bozza' check (stato in ('bozza','in_revisione','pubblicato','rifiutato')),
  nota_admin text,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index marchio_modelli_azienda_idx on public.marchio_modelli(azienda_id);
alter table public.marchio_modelli enable row level security;

create policy "modelli pubblicati visibili a tutti" on public.marchio_modelli
  for select to anon, authenticated
  using (stato = 'pubblicato' or azienda_id = (select public.marchio_mia_azienda_id()) or public.marchio_is_admin());
create policy "azienda crea i suoi modelli" on public.marchio_modelli
  for insert to authenticated
  with check (azienda_id = (select public.marchio_mia_azienda_id()) and stato = 'bozza');
create policy "azienda o admin modifica" on public.marchio_modelli
  for update to authenticated
  using (azienda_id = (select public.marchio_mia_azienda_id()) or public.marchio_is_admin())
  with check (azienda_id = (select public.marchio_mia_azienda_id()) or public.marchio_is_admin());
create policy "azienda o admin cancella" on public.marchio_modelli
  for delete to authenticated
  using (azienda_id = (select public.marchio_mia_azienda_id()) or public.marchio_is_admin());

-- L'azienda non può pubblicare da sola, né cambiare prezzo, codice o note.
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
  if new.stato not in ('bozza','in_revisione') then
    -- una modifica a un modello pubblicato lo rimanda in revisione
    if old.stato = 'pubblicato' and new.stato = 'pubblicato' then
      new.stato := 'in_revisione';
    else
      raise exception 'Solo l''amministratore può pubblicare un modello';
    end if;
  end if;
  return new;
end;
$$;
create trigger marchio_modelli_protezione
  before update on public.marchio_modelli
  for each row execute function marchio_privato.modelli_protezione();

-- Personalizzazioni (le etichette dei clienti) -----------------------------
create table public.marchio_personalizzazioni (
  id uuid primary key default gen_random_uuid(),
  modello_id uuid not null references public.marchio_modelli(id) on delete cascade,
  token text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  immagine text,
  dedica text check (char_length(dedica) <= 60),
  data_testo text check (char_length(data_testo) <= 40),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  consenso boolean not null check (consenso),
  stato text not null default 'bozza' check (stato in ('bozza','pagata','scaricata','rimossa')),
  da_controllare boolean not null default false,
  importo_cent int not null,
  creata_il timestamptz not null default now(),
  pagata_il timestamptz,
  scaricata_il timestamptz
);
create index marchio_pers_modello_idx on public.marchio_personalizzazioni(modello_id);
create index marchio_pers_creata_idx on public.marchio_personalizzazioni(creata_il);
alter table public.marchio_personalizzazioni enable row level security;
create policy "admin vede personalizzazioni" on public.marchio_personalizzazioni
  for select to authenticated using (public.marchio_is_admin());
create policy "admin modifica personalizzazioni" on public.marchio_personalizzazioni
  for update to authenticated using (public.marchio_is_admin()) with check (public.marchio_is_admin());

-- Ordini -------------------------------------------------------------------
create table public.marchio_ordini (
  id uuid primary key default gen_random_uuid(),
  personalizzazione_id uuid unique references public.marchio_personalizzazioni(id) on delete set null,
  modello_id uuid references public.marchio_modelli(id) on delete set null,
  importo_cent int not null,
  email text,
  metodo text not null check (metodo in ('prova','stripe')),
  riferimento text,
  creato_il timestamptz not null default now()
);
create index marchio_ordini_modello_idx on public.marchio_ordini(modello_id);
alter table public.marchio_ordini enable row level security;
create policy "admin vede ordini" on public.marchio_ordini
  for select to authenticated using (public.marchio_is_admin());

-- Eventi (statistiche) -------------------------------------------------------
create table public.marchio_eventi (
  id bigint generated always as identity primary key,
  modello_id uuid not null references public.marchio_modelli(id) on delete cascade,
  tipo text not null check (tipo in ('scansione','anteprima','acquisto')),
  creato_il timestamptz not null default now()
);
create index marchio_eventi_modello_idx on public.marchio_eventi(modello_id, tipo);
alter table public.marchio_eventi enable row level security;
create policy "admin vede eventi" on public.marchio_eventi
  for select to authenticated using (public.marchio_is_admin());
