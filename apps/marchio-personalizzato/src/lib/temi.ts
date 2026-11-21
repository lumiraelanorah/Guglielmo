export type NomeTema = "natale" | "sanvalentino" | "pasqua" | "regalo";

export interface Tema {
  nome: string;
  titolo: string;
  sottotitolo: string;
  simbolo: string;
}

export const TEMI: Record<NomeTema, Tema> = {
  natale: {
    nome: "Natale",
    titolo: "Un Natale con la tua storia",
    sottotitolo: "Metti la tua foto e la tua dedica sull'etichetta del regalo che hai scelto.",
    simbolo: "❄",
  },
  sanvalentino: {
    nome: "San Valentino",
    titolo: "Il regalo che parla di voi",
    sottotitolo: "Una foto, una dedica, una data: l'etichetta diventa una dichiarazione.",
    simbolo: "♥",
  },
  pasqua: {
    nome: "Pasqua",
    titolo: "Una Pasqua da ricordare",
    sottotitolo: "Rendi unico il regalo di Pasqua con una foto e due parole.",
    simbolo: "✿",
  },
  regalo: {
    nome: "Regalo",
    titolo: "Il prodotto è del marchio. La storia è tua.",
    sottotitolo: "Personalizza l'etichetta con una foto e una dedica, in pochi minuti.",
    simbolo: "✦",
  },
};

export const NOMI_TEMI = Object.keys(TEMI) as NomeTema[];

export interface VoceCalendario {
  tema: NomeTema;
  /** giorno di inizio nel formato MM-GG */
  dal: string;
}

export const CALENDARIO_PREDEFINITO: VoceCalendario[] = [
  { tema: "sanvalentino", dal: "01-01" },
  { tema: "pasqua", dal: "03-01" },
  { tema: "regalo", dal: "07-01" },
  { tema: "natale", dal: "11-01" },
];

const MMGG = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function eNomeTema(x: unknown): x is NomeTema {
  return typeof x === "string" && (NOMI_TEMI as string[]).includes(x);
}

export function calendarioValido(c: unknown): c is VoceCalendario[] {
  return (
    Array.isArray(c) &&
    c.every(
      (v) => v && typeof v === "object" && eNomeTema((v as VoceCalendario).tema) && MMGG.test(String((v as VoceCalendario).dal))
    )
  );
}

function chiave(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${m}-${g}`;
}

/** Tema attivo: la scelta manuale dell'amministratore vince, altrimenti il calendario. */
export function temaAttivo(oggi: Date, calendario: VoceCalendario[], manuale: NomeTema | null): NomeTema {
  if (manuale && eNomeTema(manuale)) return manuale;
  const voci = (calendarioValido(calendario) ? [...calendario] : []).sort((a, b) => a.dal.localeCompare(b.dal));
  if (voci.length === 0) return "regalo";
  const k = chiave(oggi);
  let scelto = voci[voci.length - 1]; // prima del primo inizio vale l'ultimo dell'anno precedente
  for (const v of voci) if (v.dal <= k) scelto = v;
  return scelto.tema;
}
