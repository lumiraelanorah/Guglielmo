import { redirect } from "next/navigation";
import { Pagina } from "@/components/templates/Pagina";
import { Avviso } from "@/components/atoms/Avviso";
import { PulsanteLink } from "@/components/atoms/Pulsante";
import { ConfermaPagamentoProva } from "@/components/organisms/ConfermaPagamentoProva";
import { leggiEtichetta } from "@/lib/server/ordini";
import { stripeAttivo } from "@/lib/server/stripe";
import { formattaPrezzo } from "@/lib/prezzo";
import { linkGrazie } from "@/lib/link";
import { TOKEN, UUID } from "@/lib/validazione";

export const metadata = { title: "Pagamento di prova", robots: { index: false } };

export default async function PagamentoProva({ searchParams }: { searchParams: Promise<{ id?: string; t?: string }> }) {
  const { id = "", t = "" } = await searchParams;
  if (stripeAttivo() || !UUID.test(id) || !TOKEN.test(t)) redirect("/");
  const e = await leggiEtichetta(id, t, false).catch(() => null);
  if (!e) redirect("/");
  if (e.stato === "pagata" || e.stato === "scaricata") redirect(linkGrazie("", id, t));

  return (
    <Pagina stretta>
      <h1>Pagamento</h1>
      <Avviso tipo="attenzione">
        <strong>Modalità di prova.</strong> I pagamenti veri non sono ancora attivi: premendo il pulsante simuli il
        pagamento e nessuno ti addebita nulla.
      </Avviso>
      <div className="scheda">
        <ul className="riepilogo">
          <li>
            <span>Prodotto</span>
            <span>
              {e.nome_prodotto} – {e.nome_azienda}
            </span>
          </li>
          <li>
            <span>Ricevuta a</span>
            <span>{e.email}</span>
          </li>
          <li>
            <strong>Totale</strong>
            <span className="prezzo">{formattaPrezzo(e.importo_cent)}</span>
          </li>
        </ul>
        <ConfermaPagamentoProva id={id} token={t} importo={formattaPrezzo(e.importo_cent)} />
        <p style={{ marginTop: "1rem" }}>
          <PulsanteLink href={`/m/${e.codice}?annullato=1`} variante="secondario" piccolo>
            Annulla
          </PulsanteLink>
        </p>
      </div>
    </Pagina>
  );
}
