import { formattaPrezzo } from "../prezzo";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export interface DatiRicevuta {
  prodotto: string;
  marchio: string;
  importoCent: number;
  link: string;
}

export function emailRicevuta(d: DatiRicevuta) {
  const oggetto = `La tua etichetta per ${d.prodotto} è pronta`;
  const testo = [
    `Grazie! Hai pagato ${formattaPrezzo(d.importoCent)} per la tua etichetta personalizzata (${d.prodotto} – ${d.marchio}).`,
    `Puoi scaricare di nuovo il file da stampare qui: ${d.link}`,
    `Il file resta disponibile per 30 giorni, poi foto e file vengono cancellati.`,
  ].join("\n\n");
  const html = `<!doctype html><html lang="it"><body style="font-family:Arial,sans-serif;font-size:17px;color:#222;line-height:1.5">
<h1 style="font-size:24px">La tua etichetta è pronta</h1>
<p>Grazie! Hai pagato <strong>${esc(formattaPrezzo(d.importoCent))}</strong> per l'etichetta personalizzata di <strong>${esc(d.prodotto)}</strong> (${esc(d.marchio)}).</p>
<p><a href="${esc(d.link)}" style="display:inline-block;background:#1f6f43;color:#fff;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Scarica di nuovo il file</a></p>
<p>Stampa il PDF al 100% (dimensione reale) sull'adesivo che trovi nella confezione e ritaglia lungo i segni.</p>
<p style="color:#666;font-size:14px">Il file resta disponibile per 30 giorni, poi foto e file vengono cancellati.</p>
</body></html>`;
  return { oggetto, testo, html };
}

export async function inviaRicevuta(a: string, d: DatiRicevuta): Promise<boolean> {
  const chiave = process.env.RESEND_API_KEY;
  if (!chiave || !a) return false;
  const e = emailRicevuta(d);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chiave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_MITTENTE || "Etichette personalizzate <onboarding@resend.dev>",
        to: [a],
        subject: e.oggetto,
        html: e.html,
        text: e.testo,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
