const DPI = 300;
const mmInPx = (mm: number) => Math.round((mm / 25.4) * DPI);

/** Adesivo rettangolare 100 × 70 mm, abbondanza 3 mm per lato, 300 dpi. */
export const STAMPA = {
  dpi: DPI,
  rifilatoMm: { w: 100, h: 70 },
  abbondanzaMm: 3,
  larghezzaPx: mmInPx(106),
  altezzaPx: mmInPx(76),
  abbondanzaPx: mmInPx(3),
} as const;

export const RAPPORTO = STAMPA.larghezzaPx / STAMPA.altezzaPx;
