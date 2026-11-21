import { NextResponse } from "next/server";
import { rpc, segretoServer } from "@/lib/server/db";
import { creaCheckout, stripeAttivo } from "@/lib/server/stripe";
import { controllaTesto } from "@/lib/testo";
import { contenutoValido } from "@/lib/regole";
import { daDataUrl, emailValida, jpegBase64Valido } from "@/lib/validazione";
import type { ModelloPubblico } from "@/lib/tipi";

export const maxDuration = 30;

function errore(messaggio: string, stato = 400) {
  return NextResponse.json({ errore: messaggio }, { status: stato });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return errore("Richiesta non valida.");

  const codice = String(b.codice ?? "").slice(0, 40);
  const immagine = daDataUrl(String(b.immagine ?? ""));
  const dedica = String(b.dedica ?? "").trim();
  const data = String(b.data ?? "").trim().slice(0, 40);
  const email = String(b.email ?? "").trim();

  if (b.consensoFoto !== true || b.condizioni !== true) return errore("Per continuare servono le due conferme.");
  if (!emailValida(email)) return errore("Scrivi un indirizzo email valido.");
  if (!jpegBase64Valido(immagine)) return errore("L'immagine dell'etichetta non è valida. Riprova.");

  const modelli = await rpc<ModelloPubblico[]>("marchio_modello_pubblico", { p_codice: codice }).catch(() => []);
  const m = modelli[0];
  if (!m) return errore("Questa etichetta non è più disponibile.", 404);

  const conFoto = b.conFoto === true;
  const esito = controllaTesto(dedica, m.max_caratteri, m.parole_vietate ?? []);
  if (!esito.ok) return errore(esito.errore ?? "Dedica non valida.");
  const regole = contenutoValido({ consentiFoto: m.consenti_foto, consentiDedica: m.consenti_dedica, haFoto: conFoto, dedica });
  if (!regole.ok) return errore(regole.errore ?? "Contenuto non valido.");
  if (data && !/^\d{1,2} [a-z]+ \d{4}$/.test(data)) return errore("Data non valida.");

  let creata: { id: string; token: string; importo_cent: number };
  try {
    const righe = await rpc<{ id: string; token: string; importo_cent: number }[]>("marchio_crea_personalizzazione", {
      p_segreto: segretoServer(),
      p_codice: codice,
      p_immagine: immagine,
      p_dedica: m.consenti_dedica && dedica ? dedica : null,
      p_data: m.consenti_data && data ? data : null,
      p_email: email,
      p_consenso: true,
      p_da_controllare: esito.daControllare,
      p_con_foto: conFoto,
    });
    creata = righe[0];
  } catch {
    return errore("Non è stato possibile salvare l'etichetta. Riprova tra poco.", 500);
  }

  const origine = new URL(req.url).origin;
  if (stripeAttivo()) {
    try {
      const url = await creaCheckout({
        id: creata.id,
        token: creata.token,
        importoCent: creata.importo_cent,
        descrizione: `Etichetta personalizzata – ${m.nome_prodotto}`,
        email,
        origine,
        codice,
      });
      return NextResponse.json({ url });
    } catch {
      return errore("Il servizio di pagamento non risponde. Riprova tra poco.", 502);
    }
  }
  return NextResponse.json({ url: `/pagamento-prova?id=${creata.id}&t=${creata.token}` });
}
