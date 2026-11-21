import { NextResponse } from "next/server";
import { firmaStripeValida } from "@/lib/server/stripe-firma";
import { registraPagamento } from "@/lib/server/ordini";
import { TOKEN, UUID } from "@/lib/validazione";

/** Conferma del pagamento da Stripe, anche se il cliente chiude la pagina dopo aver pagato. */
export async function POST(req: Request) {
  const corpo = await req.text();
  if (!firmaStripeValida(corpo, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET ?? "")) {
    return NextResponse.json({ errore: "Firma non valida" }, { status: 400 });
  }
  const evento = JSON.parse(corpo);
  if (evento.type === "checkout.session.completed" || evento.type === "checkout.session.async_payment_succeeded") {
    const s = evento.data?.object;
    const id = String(s?.metadata?.personalizzazione_id ?? "");
    const token = String(s?.metadata?.token ?? "");
    if (s?.payment_status === "paid" && UUID.test(id) && TOKEN.test(token)) {
      await registraPagamento(id, token, "stripe", String(s.id), new URL(req.url).origin);
    }
  }
  return NextResponse.json({ ricevuto: true });
}
