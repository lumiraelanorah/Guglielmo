import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pagina } from "@/components/templates/Pagina";
import { EditorEtichetta } from "@/components/organisms/EditorEtichetta";
import { Avviso } from "@/components/atoms/Avviso";
import { rpc } from "@/lib/server/db";
import { stripeAttivo } from "@/lib/server/stripe";
import type { ModelloPubblico } from "@/lib/tipi";

type Parametri = { params: Promise<{ codice: string }>; searchParams: Promise<{ annullato?: string }> };

async function carica(codice: string): Promise<ModelloPubblico | null> {
  if (!/^[a-z0-9-]{3,40}$/i.test(codice)) return null;
  const righe = await rpc<ModelloPubblico[]>("marchio_modello_pubblico", { p_codice: codice });
  return righe[0] ?? null;
}

export async function generateMetadata({ params }: Parametri): Promise<Metadata> {
  const { codice } = await params;
  const m = await carica(codice).catch(() => null);
  return { title: m ? `Personalizza l'etichetta – ${m.nome_prodotto}` : "Etichetta non trovata" };
}

export default async function PaginaModello({ params, searchParams }: Parametri) {
  const { codice } = await params;
  const { annullato } = await searchParams;
  const modello = await carica(codice);
  if (!modello) notFound();
  await rpc("marchio_registra_evento", { p_codice: modello.codice, p_tipo: "scansione" }).catch(() => undefined);

  return (
    <Pagina>
      <p style={{ marginBottom: ".25rem", fontWeight: 700, color: "var(--colore-testo-tenue)" }}>{modello.nome_azienda}</p>
      <h1>{modello.nome_prodotto}: crea la tua etichetta</h1>
      {annullato ? <Avviso tipo="attenzione">Il pagamento è stato annullato. Nessun addebito: puoi riprovare quando vuoi.</Avviso> : null}
      <EditorEtichetta modello={modello} pagamentoDiProva={!stripeAttivo()} />
    </Pagina>
  );
}
