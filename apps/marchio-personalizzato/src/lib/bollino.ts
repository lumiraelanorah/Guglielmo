const corto = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Bollino da stampare sulla confezione (50 × 60 mm, vettoriale): invito a personalizzare + QR.
 * `qrSvg` è l'SVG del codice QR (come lo produce la libreria qrcode).
 */
export function creaBollinoSvg(qrSvg: string, info: { marchio: string; prodotto: string }): string {
  const vb = /viewBox="([^"]+)"/.exec(qrSvg)?.[1] ?? "0 0 29 29";
  const interno = qrSvg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="60mm" viewBox="0 0 500 600">
  <rect x="4" y="4" width="492" height="592" rx="36" fill="#ffffff" stroke="#1f1a17" stroke-width="6"/>
  <text x="250" y="70" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="bold" fill="#1f1a17">Rendi tuo</text>
  <text x="250" y="114" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="bold" fill="#1f1a17">questo regalo</text>
  <svg x="110" y="135" width="280" height="280" viewBox="${esc(vb)}">${interno}</svg>
  <text x="250" y="458" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" fill="#1f1a17">Inquadra il codice e metti</text>
  <text x="250" y="490" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" fill="#1f1a17">la tua foto o una dedica</text>
  <text x="250" y="522" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" fill="#1f1a17">sull'etichetta</text>
  <text x="250" y="566" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#574c45">${esc(corto([info.marchio, info.prodotto].filter(Boolean).join(" · "), 44))}</text>
</svg>`;
}
