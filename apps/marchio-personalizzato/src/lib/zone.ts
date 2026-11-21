/** Zona espressa in frazioni (0..1) dell'etichetta completa di abbondanza. */
export interface Zona {
  x: number;
  y: number;
  w: number;
  h: number;
  /** solo per la foto: rettangolo (predefinito) o ovale */
  forma?: "rettangolo" | "ovale";
}

export interface Rettangolo {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Dimensioni {
  w: number;
  h: number;
}

/** zoom ≥ 1; px, py tra -1 e 1 (0 = centrata) */
export interface PosizioneFoto {
  zoom: number;
  px: number;
  py: number;
}

export const POSIZIONE_INIZIALE: PosizioneFoto = { zoom: 1, px: 0, py: 0 };

const MIN_LATO = 0.03;

export function zonaValida(z: unknown): z is Zona {
  if (!z || typeof z !== "object") return false;
  const { x, y, w, h, forma } = z as Zona;
  if (![x, y, w, h].every((n) => typeof n === "number" && Number.isFinite(n))) return false;
  if (forma !== undefined && forma !== "rettangolo" && forma !== "ovale") return false;
  return x >= 0 && y >= 0 && w >= MIN_LATO && h >= MIN_LATO && x + w <= 1.0001 && y + h <= 1.0001;
}

export function zonaInPixel(z: Zona, larghezza: number, altezza: number): Rettangolo {
  return { x: z.x * larghezza, y: z.y * altezza, w: z.w * larghezza, h: z.h * altezza };
}

const limita = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Da due punti (frazioni) a una zona ordinata e dentro l'etichetta. */
export function normalizzaRettangolo(a: { x: number; y: number }, b: { x: number; y: number }): Zona {
  const x1 = limita(Math.min(a.x, b.x), 0, 1);
  const y1 = limita(Math.min(a.y, b.y), 0, 1);
  const x2 = limita(Math.max(a.x, b.x), 0, 1);
  const y2 = limita(Math.max(a.y, b.y), 0, 1);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Dove disegnare la foto perché copra sempre tutta la zona. */
export function posizioneFoto(zona: Rettangolo, foto: Dimensioni, pos: PosizioneFoto): Rettangolo {
  const base = Math.max(zona.w / foto.w, zona.h / foto.h);
  const s = base * Math.max(1, pos.zoom);
  const w = foto.w * s;
  const h = foto.h * s;
  const maxX = (w - zona.w) / 2;
  const maxY = (h - zona.h) / 2;
  const x = zona.x + (zona.w - w) / 2 + limita(pos.px, -1, 1) * maxX;
  const y = zona.y + (zona.h - h) / 2 + limita(pos.py, -1, 1) * maxY;
  return { x, y, w, h };
}

/** Applica uno spostamento in pixel (stessa scala della zona) restando nei limiti. */
export function limitaSpostamento(zona: Rettangolo, foto: Dimensioni, pos: PosizioneFoto, dx: number, dy: number): PosizioneFoto {
  const r = posizioneFoto(zona, foto, pos);
  const maxX = (r.w - zona.w) / 2;
  const maxY = (r.h - zona.h) / 2;
  return {
    zoom: pos.zoom,
    px: maxX > 0 ? limita(pos.px + dx / maxX, -1, 1) : 0,
    py: maxY > 0 ? limita(pos.py + dy / maxY, -1, 1) : 0,
  };
}
