const DPI = 300;
const ABBONDANZA_MM = 3;
const mmInPx = (mm: number) => Math.round((mm / 25.4) * DPI);

export interface Misure {
  larghezzaPx: number;
  altezzaPx: number;
  abbondanzaPx: number;
  larghezzaMm: number;
  altezzaMm: number;
}

/** Formati di adesivo disponibili (misura finita, senza abbondanza). */
export const FORMATI = [
  { larghezzaMm: 100, altezzaMm: 70, nome: "Orizzontale 10 × 7 cm" },
  { larghezzaMm: 70, altezzaMm: 100, nome: "Verticale 7 × 10 cm" },
  { larghezzaMm: 80, altezzaMm: 100, nome: "Verticale 8 × 10 cm (quasi quadrato)" },
  { larghezzaMm: 90, altezzaMm: 90, nome: "Quadrato 9 × 9 cm" },
] as const;

export function formatoValido(w: number, h: number): boolean {
  return FORMATI.some((f) => f.larghezzaMm === w && f.altezzaMm === h);
}

/** Misure in pixel (300 dpi) dell'etichetta completa di abbondanza di 3 mm per lato. */
export function misure(larghezzaMm = 100, altezzaMm = 70): Misure {
  return {
    larghezzaPx: mmInPx(larghezzaMm + 2 * ABBONDANZA_MM),
    altezzaPx: mmInPx(altezzaMm + 2 * ABBONDANZA_MM),
    abbondanzaPx: mmInPx(ABBONDANZA_MM),
    larghezzaMm,
    altezzaMm,
  };
}

/** Formato predefinito: 100 × 70 mm. */
export const STAMPA = { dpi: DPI, rifilatoMm: { w: 100, h: 70 }, abbondanzaMm: ABBONDANZA_MM, ...misure() } as const;
