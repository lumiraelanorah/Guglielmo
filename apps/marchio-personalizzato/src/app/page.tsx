import { PulsanteLink } from "@/components/atoms/Pulsante";
import { Pagina } from "@/components/templates/Pagina";
import { temaDiOggi } from "@/lib/server/tema";
import { TEMI } from "@/lib/temi";

export default async function Home() {
  const t = TEMI[await temaDiOggi()];
  return (
    <Pagina>
      <section className="eroe">
        <div className="eroe__simbolo" aria-hidden="true">
          {t.simbolo}
        </div>
        <h1>{t.titolo}</h1>
        <p>{t.sottotitolo}</p>
        <div className="riga-pulsanti" style={{ justifyContent: "center" }}>
          <PulsanteLink href="/m/prova">Prova con il prodotto di esempio</PulsanteLink>
          <PulsanteLink href="/azienda" variante="secondario">
            Sei un&apos;azienda?
          </PulsanteLink>
        </div>
      </section>

      <div className="griglia griglia--due">
        <section className="scheda">
          <h2>Come funziona</h2>
          <ol className="come-funziona">
            {[
              ["Inquadra il QR", "Lo trovi sulla confezione del prodotto. Si apre questa pagina, senza installare nulla."],
              ["Metti la tua foto", "La sposti e la ingrandisci dentro lo spazio previsto dal marchio."],
              ["Scrivi una dedica e una data", "Se vuoi. Le vedi subito sull'etichetta."],
              ["Guarda l'anteprima e paga", "Vedi l'etichetta esattamente come verrà stampata."],
              ["Scarica e stampa", "Ricevi il file da stampare sull'adesivo che trovi nella confezione."],
            ].map(([titolo, testo], i) => (
              <li key={titolo}>
                <span className="come-funziona__num">{i + 1}</span>
                <span>
                  <strong>{titolo}.</strong> {testo}
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section className="scheda">
          <h2>Per le aziende</h2>
          <p>
            Carica la grafica dell&apos;etichetta, scegli dove il cliente può mettere foto e testo, e ricevi il QR da stampare
            sulla confezione. Le informazioni obbligatorie restano sempre intatte.
          </p>
          <PulsanteLink href="/accedi" variante="secondario">
            Entra o registrati
          </PulsanteLink>
        </section>
      </div>
    </Pagina>
  );
}
