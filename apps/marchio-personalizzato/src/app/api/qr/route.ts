import QRCode from "qrcode";
import { linkModello } from "@/lib/link";

/** QR (PNG) che apre la pagina del modello. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const codice = u.searchParams.get("codice") ?? "";
  if (!/^[a-z0-9-]{3,40}$/i.test(codice)) return new Response("Codice non valido", { status: 400 });
  const scarica = u.searchParams.get("scarica") === "1";
  const png = await QRCode.toBuffer(linkModello(u.origin, codice), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 1024,
  });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      ...(scarica ? { "Content-Disposition": `attachment; filename="qr-${codice}.png"` } : {}),
    },
  });
}
