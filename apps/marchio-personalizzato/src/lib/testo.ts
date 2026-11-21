/** Minuscolo, senza accenti, cifre "camuffate" riportate a lettere. */
export function normalizza(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");
}

// Radici bloccate: confrontate sia parola per parola sia sul testo senza spazi.
const BLOCCATE = [
  "cazz", "stronz", "vaffancul", "fancul", "troia", "puttan", "mignott", "merda", "coglion",
  "bastard", "frocio", "froci", "ricchion", "negro", "zoccol", "porcodio", "diocane",
  "dioporco", "pompin", "sborr", "inculat",
  "culattone", "handicappat", "mongoloid", "nazist", "hitler", "duce", "ammazzat", "uccidi",
  "fuck", "shit", "bitch", "cunt", "nigger", "faggot", "porn",
];
// Parole dubbie: accettate ma segnalate all'amministratore.
const DUBBIE = ["figa", "figata", "culo", "palle", "sfiga", "minchia", "porco", "cavolo", "morte", "droga", "sexy", "idiota", "scemo", "cretin", "deficient"];

// parole normali che contengono una radice dubbia
const ECCEZIONI = ["fico", "cassetta", "scappare", "analisi", "pompei", "coglierai", "porcellana", "porcini", "ducetto", "negroni", "cazzuol", "shitake", "troiano"];

function parole(t: string): string[] {
  return normalizza(t).split(/[^a-z]+/).filter(Boolean);
}

function contieneRadice(testo: string, radici: string[]): boolean {
  const ps = parole(testo);
  for (const p of ps) {
    if (ECCEZIONI.some((e) => p.startsWith(e))) continue;
    if (radici.some((r) => p.startsWith(r) || (r.length >= 6 && p.includes(r)))) return true;
  }
  // testo scritto a lettere separate ("v a f f a n c u l o")
  if (ps.filter((p) => p.length === 1).length >= 3) {
    const unito = ps.join("");
    return radici.filter((r) => r.length >= 5).some((r) => unito.includes(r));
  }
  return false;
}

export interface EsitoTesto {
  ok: boolean;
  errore?: string;
  daControllare: boolean;
}

/** Dal campo dell'azienda ("a, b; c") a un elenco pulito: minuscolo, senza doppioni, al massimo 100. */
export function analizzaParoleVietate(campo: string): string[] {
  const visti = new Set<string>();
  for (const p of (campo ?? "").split(/[,;\n]+/)) {
    const v = p.trim().toLowerCase();
    if (v.length >= 2 && v.length <= 30) visti.add(v);
  }
  return [...visti].slice(0, 100);
}

export function controllaTesto(testo: string, max: number, vietateDalMarchio: string[] = []): EsitoTesto {
  const t = (testo ?? "").trim();
  if (t.length > max) return { ok: false, errore: `Massimo ${max} caratteri.`, daControllare: false };
  const unito = parole(t).join("");
  for (const v of vietateDalMarchio) {
    const vn = parole(v).join("");
    if (vn.length >= 3 && unito.includes(vn)) {
      return { ok: false, errore: `"${v}" non è consentito su questa etichetta.`, daControllare: false };
    }
  }
  if (contieneRadice(t, BLOCCATE)) {
    return { ok: false, errore: "Questo testo contiene parole non consentite. Prova a riscriverlo.", daControllare: false };
  }
  const daControllare = parole(t).some((p) => DUBBIE.some((d) => p.startsWith(d)));
  return { ok: true, daControllare };
}

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

/** "2026-12-25" → "25 dicembre 2026" */
export function formattaData(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return "";
  const mese = Number(m[2]);
  const giorno = Number(m[3]);
  if (mese < 1 || mese > 12 || giorno < 1 || giorno > 31) return "";
  return `${giorno} ${MESI[mese - 1]} ${m[1]}`;
}
