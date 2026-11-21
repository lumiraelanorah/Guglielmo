import QRCode from "qrcode";
import { rpc } from "@/lib/server/db";
import { creaBollinoSvg } from "@/lib/bollino";
import { linkModello } from "@/lib/link";
import type { ModelloPubblico } from "@/lib/tipi";

/** Bollino da stampare sulle confezioni: invito a personalizzare + QR (SVG vettoriale, 5 × 6 cm). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const codice = u.searchParams.get("codice") ?? "";
  if (!/^[a-z0-9-]{3,40}$/i.test(codice)) return new Response("Codice non valido", { status: 400 });
  const righe = await rpc<ModelloPubblico[]>("marchio_modello_pubblico", { p_codice: codice }).catch(() => []);
  const m = righe[0];
  const qr = await QRCode.toString(linkModello(u.origin, codice), { type: "svg", errorCorrectionLevel: "M", margin: 1 });
  const svg = creaBollinoSvg(qr, { marchio: m?.nome_azienda ?? "", prodotto: m?.nome_prodotto ?? "" });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      ...(u.searchParams.get("scarica") === "1" ? { "Content-Disposition": `attachment; filename="bollino-${codice}.svg"` } : {}),
    },
  });
}
