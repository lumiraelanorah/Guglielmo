import { linkGrazie } from "../link";

export function stripeAttivo(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export interface DatiCheckout {
  id: string;
  token: string;
  importoCent: number;
  descrizione: string;
  email: string | null;
  origine: string;
  codice?: string;
}

export function parametriCheckout(d: DatiCheckout): URLSearchParams {
  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("locale", "it");
  p.set("line_items[0][quantity]", "1");
  p.set("line_items[0][price_data][currency]", "eur");
  p.set("line_items[0][price_data][unit_amount]", String(d.importoCent));
  p.set("line_items[0][price_data][product_data][name]", d.descrizione);
  if (d.email) p.set("customer_email", d.email);
  p.set("metadata[personalizzazione_id]", d.id);
  p.set("success_url", `${linkGrazie(d.origine, d.id, d.token)}&session_id={CHECKOUT_SESSION_ID}`);
  p.set("cancel_url", d.codice ? `${d.origine}/m/${encodeURIComponent(d.codice)}?annullato=1` : `${d.origine}/`);
  return p;
}

async function chiamaStripe(percorso: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.stripe.com/v1/${percorso}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json?.error?.message ?? "Errore del servizio di pagamento");
  return json;
}

export async function creaCheckout(d: DatiCheckout): Promise<string> {
  const s = await chiamaStripe("checkout/sessions", { method: "POST", body: parametriCheckout(d).toString() });
  return s.url as string;
}

/** Vero se la sessione è pagata e riguarda proprio questa etichetta. */
export async function sessionePagata(sessionId: string, personalizzazioneId: string): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false;
  const s = await chiamaStripe(`checkout/sessions/${sessionId}`);
  return s.payment_status === "paid" && s.metadata?.personalizzazione_id === personalizzazioneId;
}
