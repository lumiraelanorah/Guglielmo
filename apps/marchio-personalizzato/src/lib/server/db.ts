/** Accesso ai dati dal server: solo funzioni del database protette dal segreto del server. */
const URL_DB = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const CHIAVE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function segretoServer(): string {
  return process.env.MARCHIO_SEGRETO_SERVER ?? "";
}

export class ErroreDb extends Error {}

export async function rpc<T>(nome: string, argomenti: Record<string, unknown>, opzioni: { revalida?: number } = {}): Promise<T> {
  if (!URL_DB || !CHIAVE) throw new ErroreDb("Configurazione mancante");
  const r = await fetch(`${URL_DB}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: CHIAVE, Authorization: `Bearer ${CHIAVE}`, "Content-Type": "application/json" },
    body: JSON.stringify(argomenti),
    ...(opzioni.revalida ? { next: { revalidate: opzioni.revalida } } : { cache: "no-store" as const }),
  });
  const testo = await r.text();
  const dati = testo ? JSON.parse(testo) : null;
  if (!r.ok) throw new ErroreDb(dati?.message ?? `Errore ${r.status}`);
  return dati as T;
}

export async function leggi<T>(percorso: string, revalida = 60): Promise<T> {
  if (!URL_DB || !CHIAVE) throw new ErroreDb("Configurazione mancante");
  const r = await fetch(`${URL_DB}/rest/v1/${percorso}`, {
    headers: { apikey: CHIAVE, Authorization: `Bearer ${CHIAVE}` },
    next: { revalidate: revalida },
  });
  if (!r.ok) throw new ErroreDb(`Errore ${r.status}`);
  return (await r.json()) as T;
}
