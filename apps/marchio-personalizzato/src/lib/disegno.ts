import { posizioneFoto, zonaInPixel, zonaValida, type PosizioneFoto, type Zona } from "./zone";
import { STAMPA } from "./stampa-misure";

export type FontModello = "serif" | "corsivo" | "semplice";

export const FONT_CSS: Record<FontModello, string> = {
  serif: '"Playfair Display", Georgia, serif',
  corsivo: '"Dancing Script", "Brush Script MT", cursive',
  semplice: '"Nunito", Arial, sans-serif',
};

export const FONT_NOMI: Record<FontModello, string> = {
  serif: "Elegante",
  corsivo: "Corsivo",
  semplice: "Semplice",
};

export interface Adattamento {
  righe: string[];
  dimensione: number;
}

/** Spezza il testo in righe e trova la dimensione più grande che entra nel riquadro. */
export function adattaTesto(
  testo: string,
  larghezza: number,
  altezza: number,
  misura: (t: string, dimensione: number) => number,
  max = 80,
  min = 12,
  interlinea = 1.2
): Adattamento {
  const parole = testo.trim().split(/\s+/).filter(Boolean);
  if (parole.length === 0) return { righe: [], dimensione: max };
  for (let d = max; d >= min; d -= 1) {
    const righe: string[] = [];
    let corrente = "";
    let entra = true;
    for (const p of parole) {
      const prova = corrente ? `${corrente} ${p}` : p;
      if (misura(prova, d) <= larghezza) {
        corrente = prova;
      } else {
        if (corrente) righe.push(corrente);
        corrente = p;
        if (misura(p, d) > larghezza) entra = false;
      }
    }
    if (corrente) righe.push(corrente);
    if (entra && righe.length * d * interlinea <= altezza) return { righe, dimensione: d };
  }
  // all'ultimo: dimensione minima, una parola per riga se serve
  return { righe: parole, dimensione: min };
}

export interface ModelloDisegno {
  zona_foto: Zona | null;
  zona_dedica: Zona | null;
  zona_data: Zona | null;
  font: FontModello;
  colore_testo: string;
}

export interface Contenuto {
  foto: CanvasImageSource & { width: number; height: number } | null;
  posizione: PosizioneFoto;
  dedica: string;
  data: string;
}

export interface OpzioniDisegno {
  mostraZone?: boolean;
  mostraTaglio?: boolean;
  evidenzia?: "foto" | "dedica" | "data" | null;
}

type Ctx = CanvasRenderingContext2D;

function disegnaCover(ctx: Ctx, img: CanvasImageSource & { width: number; height: number }, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function scriviNelRiquadro(ctx: Ctx, testo: string, z: Zona, font: FontModello, colore: string, W: number, H: number) {
  if (!testo.trim()) return;
  const r = zonaInPixel(z, W, H);
  const margine = Math.min(r.w, r.h) * 0.06;
  const famiglia = FONT_CSS[font];
  const peso = font === "corsivo" ? "600" : "500";
  const misura = (t: string, d: number) => {
    ctx.font = `${peso} ${d}px ${famiglia}`;
    return ctx.measureText(t).width;
  };
  const max = Math.max(14, Math.floor(r.h * 0.6));
  const { righe, dimensione } = adattaTesto(testo, r.w - 2 * margine, r.h - 2 * margine, misura, Math.min(max, 110), 14);
  ctx.save();
  ctx.font = `${peso} ${dimensione}px ${famiglia}`;
  ctx.fillStyle = colore;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const passo = dimensione * 1.2;
  const inizio = r.y + r.h / 2 - ((righe.length - 1) * passo) / 2;
  righe.forEach((riga, i) => ctx.fillText(riga, r.x + r.w / 2, inizio + i * passo));
  ctx.restore();
}

function contornoZona(ctx: Ctx, z: Zona, etichetta: string, attiva: boolean, W: number, H: number) {
  const r = zonaInPixel(z, W, H);
  ctx.save();
  ctx.fillStyle = attiva ? "rgba(255, 196, 0, 0.22)" : "rgba(0, 120, 255, 0.10)";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.setLineDash([18, 12]);
  ctx.lineWidth = 6;
  ctx.strokeStyle = attiva ? "#e0a000" : "#1f6fd1";
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.setLineDash([]);
  const d = Math.max(22, Math.min(42, r.h * 0.18));
  ctx.font = `700 ${d}px "Nunito", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tw = ctx.measureText(etichetta).width + d;
  ctx.fillStyle = attiva ? "#e0a000" : "#1f6fd1";
  ctx.fillRect(r.x + r.w / 2 - tw / 2, r.y + r.h / 2 - d * 0.8, tw, d * 1.6);
  ctx.fillStyle = "#fff";
  ctx.fillText(etichetta, r.x + r.w / 2, r.y + r.h / 2);
  ctx.restore();
}

/** Disegna l'etichetta completa (con abbondanza) sul canvas a piena risoluzione. */
export function disegnaEtichetta(
  ctx: Ctx,
  modelloImg: (CanvasImageSource & { width: number; height: number }) | null,
  modello: ModelloDisegno,
  c: Contenuto,
  opz: OpzioniDisegno = {}
) {
  const W = STAMPA.larghezzaPx;
  const H = STAMPA.altezzaPx;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  if (modelloImg) disegnaCover(ctx, modelloImg, W, H);

  if (zonaValida(modello.zona_foto)) {
    const zona = zonaInPixel(modello.zona_foto, W, H);
    if (c.foto) {
      const p = posizioneFoto(zona, { w: c.foto.width, h: c.foto.height }, c.posizione);
      ctx.save();
      ctx.beginPath();
      ctx.rect(zona.x, zona.y, zona.w, zona.h);
      ctx.clip();
      ctx.drawImage(c.foto, p.x, p.y, p.w, p.h);
      ctx.restore();
    } else if (opz.mostraZone) {
      contornoZona(ctx, modello.zona_foto, "La tua foto qui", opz.evidenzia === "foto", W, H);
    }
  }
  if (zonaValida(modello.zona_dedica)) {
    if (c.dedica.trim()) scriviNelRiquadro(ctx, c.dedica, modello.zona_dedica, modello.font, modello.colore_testo, W, H);
    else if (opz.mostraZone) contornoZona(ctx, modello.zona_dedica, "Dedica", opz.evidenzia === "dedica", W, H);
  }
  if (zonaValida(modello.zona_data)) {
    if (c.data.trim()) scriviNelRiquadro(ctx, c.data, modello.zona_data, modello.font, modello.colore_testo, W, H);
    else if (opz.mostraZone) contornoZona(ctx, modello.zona_data, "Data", opz.evidenzia === "data", W, H);
  }

  if (opz.mostraTaglio) {
    const b = STAMPA.abbondanzaPx;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(0, 0, W, b);
    ctx.fillRect(0, H - b, W, b);
    ctx.fillRect(0, b, b, H - 2 * b);
    ctx.fillRect(W - b, b, b, H - 2 * b);
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#d11f4a";
    ctx.strokeRect(b, b, W - 2 * b, H - 2 * b);
    ctx.restore();
  }
}
