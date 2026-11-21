import { rpc, segretoServer } from "@/lib/server/db";
import { leggiEtichetta } from "@/lib/server/ordini";
import { creaPdfStampa } from "@/lib/server/pdf";
import { TOKEN, UUID } from "@/lib/validazione";

export const maxDuration = 30;

function nomeFile(prodotto: string, est: string) {
  const base = prodotto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `etichetta-${base || "personalizzata"}.${est}`;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get("id") ?? "";
  const token = u.searchParams.get("t") ?? "";
  const anteprima = u.searchParams.get("anteprima") === "1";
  const formato = anteprima || u.searchParams.get("formato") === "jpg" ? "jpg" : "pdf";
  if (!UUID.test(id) || !TOKEN.test(token)) return new Response("Link non valido", { status: 400 });

  const e = await leggiEtichetta(id, token, true).catch(() => null);
  if (!e || !e.immagine || (e.stato !== "pagata" && e.stato !== "scaricata")) {
    return new Response("File non disponibile", { status: 404 });
  }
  const jpeg = Buffer.from(e.immagine, "base64");
  if (!anteprima) await rpc("marchio_segna_scaricata", { p_segreto: segretoServer(), p_id: id, p_token: token }).catch(() => undefined);

  const intestazioni = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex",
  };
  if (formato === "jpg") {
    return new Response(new Uint8Array(jpeg), {
      headers: {
        ...intestazioni,
        "Content-Type": "image/jpeg",
        "Content-Disposition": `${anteprima ? "inline" : "attachment"}; filename="${nomeFile(e.nome_prodotto, "jpg")}"`,
      },
    });
  }
  const pdf = await creaPdfStampa(jpeg, { titolo: e.nome_prodotto, marchio: e.nome_azienda });
  return new Response(new Uint8Array(pdf), {
    headers: {
      ...intestazioni,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeFile(e.nome_prodotto, "pdf")}"`,
    },
  });
}
