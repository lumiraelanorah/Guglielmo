import { Pagina } from "@/components/templates/Pagina";
import { Avviso } from "@/components/atoms/Avviso";
import { PulsanteLink } from "@/components/atoms/Pulsante";
import { leggiEtichetta, registraPagamento } from "@/lib/server/ordini";
import { sessionePagata, stripeAttivo } from "@/lib/server/stripe";
import { origine } from "@/lib/server/origine";
import { formattaPrezzo } from "@/lib/prezzo";
import { TOKEN, UUID } from "@/lib/validazione";

export const metadata = { title: "La tua etichetta", robots: { index: false } };

type Q = { id?: string; t?: string; session_id?: string };

export default async function Grazie({ searchParams }: { searchParams: Promise<Q> }) {
  const { id = "", t = "", session_id } = await searchParams;
  if (!UUID.test(id) || !TOKEN.test(t)) {
    return (
      <Pagina stretta>
        <h1>Link non valido</h1>
        <p>Controlla di aver copiato tutto il link che ti abbiamo mandato per email.</p>
      </Pagina>
    );
  }

  let e = await leggiEtichetta(id, t, false).catch(() => null);
  if (e && e.stato === "bozza" && session_id && stripeAttivo()) {
    const pagata = await sessionePagata(session_id, id).catch(() => false);
    if (pagata) {
      await registraPagamento(id, t, "stripe", session_id, await origine()).catch(() => undefined);
      e = await leggiEtichetta(id, t, false).catch(() => e);
    }
  }

  if (!e) {
    return (
      <Pagina stretta>
        <h1>Etichetta non trovata</h1>
        <p>Il file potrebbe essere stato cancellato: foto e file restano disponibili per 30 giorni.</p>
      </Pagina>
    );
  }
  if (e.stato === "rimossa") {
    return (
      <Pagina stretta>
        <h1>Etichetta non disponibile</h1>
        <p>Questa etichetta è stata rimossa. Per informazioni rispondi all&apos;email della ricevuta.</p>
      </Pagina>
    );
  }
  if (e.stato === "bozza") {
    return (
      <Pagina stretta>
        <h1>Pagamento non ancora confermato</h1>
        <Avviso tipo="attenzione">
          Non abbiamo ancora ricevuto la conferma del pagamento. Se hai appena pagato, aspetta qualche secondo e ricarica la
          pagina.
        </Avviso>
        <PulsanteLink href={`/m/${e.codice}`} variante="secondario">
          Torna all&apos;etichetta
        </PulsanteLink>
      </Pagina>
    );
  }

  const base = `/api/scarica?id=${id}&t=${t}`;
  return (
    <Pagina>
      <h1>Grazie! La tua etichetta è pronta</h1>
      <p>
        Hai pagato {formattaPrezzo(e.importo_cent)} per l&apos;etichetta di <strong>{e.nome_prodotto}</strong>.
        {e.email ? <> Ti abbiamo mandato la ricevuta e questo link a {e.email}.</> : null}
      </p>
      <div className="griglia griglia--due">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${base}&anteprima=1`}
            alt={`La tua etichetta personalizzata per ${e.nome_prodotto}`}
            style={{ width: "100%", borderRadius: 14, boxShadow: "var(--ombra)" }}
          />
        </div>
        <div className="scheda">
          <h2>Scarica il file</h2>
          <div className="riga-pulsanti" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <PulsanteLink href={base} download largo>
              ⬇ Scarica il PDF da stampare
            </PulsanteLink>
            <PulsanteLink href={`${base}&formato=jpg`} download largo variante="secondario">
              Scarica l&apos;immagine (JPG)
            </PulsanteLink>
          </div>
          <section className="sezione-stampa" style={{ marginTop: "1.5rem" }}>
            <h3>Come stamparla</h3>
            <ol>
              <li>Prendi l&apos;adesivo che trovi nella confezione e mettilo nella stampante.</li>
              <li>Apri il PDF e stampa con dimensione <strong>&quot;Reale&quot; o &quot;100%&quot;</strong> (non &quot;Adatta alla pagina&quot;).</li>
              <li>Ritaglia lungo i segni agli angoli: l&apos;etichetta misura 10 × 7 cm.</li>
              <li>Attaccala sulla confezione, sopra lo spazio del marchio.</li>
            </ol>
            <p className="campo__aiuto">Il file resta disponibile per 30 giorni da questo link.</p>
          </section>
        </div>
      </div>
    </Pagina>
  );
}
