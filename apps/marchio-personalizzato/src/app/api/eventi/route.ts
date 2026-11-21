import { NextResponse } from "next/server";
import { rpc } from "@/lib/server/db";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.codice !== "string" || b.tipo !== "anteprima") {
    return NextResponse.json({ errore: "Richiesta non valida" }, { status: 400 });
  }
  await rpc("marchio_registra_evento", { p_codice: b.codice.slice(0, 40), p_tipo: "anteprima" }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
