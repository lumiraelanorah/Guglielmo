import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const pt = (mm: number) => (mm / 25.4) * 72;

export const MARGINE_SEGNI_MM = 12;
const ABBONDANZA = 3;

/** PDF di stampa: etichetta nel formato del modello (predefinito 100×70 mm), 3 mm di abbondanza e segni di taglio. */
export async function creaPdfStampa(
  jpeg: Uint8Array,
  info: { titolo: string; marchio: string },
  formato: { larghezzaMm: number; altezzaMm: number } = { larghezzaMm: 100, altezzaMm: 70 }
): Promise<Uint8Array> {
  const RIFILATO = { w: formato.larghezzaMm, h: formato.altezzaMm };
  const doc = await PDFDocument.create();
  doc.setTitle(`Etichetta – ${info.titolo}`);
  doc.setAuthor(info.marchio);
  doc.setCreator("Etichette personalizzate");

  const pagW = pt(RIFILATO.w + 2 * ABBONDANZA + 2 * MARGINE_SEGNI_MM);
  const pagH = pt(RIFILATO.h + 2 * ABBONDANZA + 2 * MARGINE_SEGNI_MM);
  const page = doc.addPage([pagW, pagH]);

  const bx = pt(MARGINE_SEGNI_MM);
  const by = pt(MARGINE_SEGNI_MM);
  const bw = pt(RIFILATO.w + 2 * ABBONDANZA);
  const bh = pt(RIFILATO.h + 2 * ABBONDANZA);
  const tx = bx + pt(ABBONDANZA);
  const ty = by + pt(ABBONDANZA);
  const tw = pt(RIFILATO.w);
  const th = pt(RIFILATO.h);

  page.setBleedBox(bx, by, bw, bh);
  page.setTrimBox(tx, ty, tw, th);

  // copia: pdf-lib legge il buffer sottostante ignorando l'offset dei Buffer di Node
  const img = await doc.embedJpg(new Uint8Array(jpeg));
  page.drawImage(img, { x: bx, y: by, width: bw, height: bh });

  // segni di taglio, fuori dall'area di abbondanza
  const nero = rgb(0, 0, 0);
  const lungo = pt(6);
  const stacco = pt(ABBONDANZA + 1);
  const spessore = 0.5;
  for (const x of [tx, tx + tw]) {
    page.drawLine({ start: { x, y: ty - stacco }, end: { x, y: ty - stacco - lungo }, thickness: spessore, color: nero });
    page.drawLine({ start: { x, y: ty + th + stacco }, end: { x, y: ty + th + stacco + lungo }, thickness: spessore, color: nero });
  }
  for (const y of [ty, ty + th]) {
    page.drawLine({ start: { x: tx - stacco, y }, end: { x: tx - stacco - lungo, y }, thickness: spessore, color: nero });
    page.drawLine({ start: { x: tx + tw + stacco, y }, end: { x: tx + tw + stacco + lungo, y }, thickness: spessore, color: nero });
  }

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const nota = `Stampa al 100% (dimensione reale) e ritaglia lungo i segni: ${RIFILATO.w} x ${RIFILATO.h} mm`;
  page.drawText(nota, { x: pt(3), y: pt(3), size: 6, font, color: rgb(0.35, 0.35, 0.35) });

  return doc.save();
}
