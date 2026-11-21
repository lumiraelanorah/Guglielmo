import { NextResponse } from "next/server";
import { registraPagamento } from "@/lib/server/ordini";
import { stripeAttivo } from "@/lib/server/stripe";
import { TOKEN, UUID } from "@/lib/validazione";
import { linkGrazie } from "@/lib/link";

/** Solo finché i pagamenti veri non sono collegati. */
export async function POST(req: Request) {
  if (stripeAttivo()) return NextResponse.json({ errore: "Pagamento di prova non disponibile." }, { status: 403 });
  const b = await req.json().catch(() => null);
  const id = String(b?.id ?? "");
  const token = String(b?.t ?? "");
  if (!UUID.test(id) || !TOKEN.test(token)) return NextResponse.json({ errore: "Richiesta non valida." }, { status: 400 });
  const origine = new URL(req.url).origin;
  try {
    await registraPagamento(id, token, "prova", `prova-${Date.now()}`, origine);
  } catch {
    return NextResponse.json({ errore: "Non è stato possibile completare il pagamento di prova." }, { status: 500 });
  }
  return NextResponse.json({ url: linkGrazie("", id, token) });
}
