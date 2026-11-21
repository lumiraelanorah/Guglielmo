import { PulsanteLink } from "@/components/atoms/Pulsante";
import { Pagina } from "@/components/templates/Pagina";

export const metadata = { title: "Per le aziende – Etichetta Tua" };

const VANTAGGI = [
  ["Gratis per voi", "Aderire non costa nulla: nessun canone, nessun costo di avvio. Guadagnate una parte di ogni etichetta venduta."],
  ["Più vendite nelle feste", "Il vostro prodotto diventa un regalo personale: Natale, San Valentino, compleanni, anniversari."],
  ["Pubblicità che non pagate", "Chi riceve una bottiglia con la propria foto la fotografa e la condivide, con il vostro marchio in bella vista."],
  ["Il marchio resta vostro", "Decidete voi dove si mettono foto e messaggi, cosa è permesso e cosa no. Le informazioni obbligatorie non si toccano mai."],
  ["Controllo automatico", "Ogni etichetta viene controllata in automatico secondo le vostre regole. Potete vederle tutte e ritirarne una in qualsiasi momento."],
  ["Conoscete i vostri clienti", "Vedete quante persone inquadrano il QR, quante provano e quante comprano."],
];

export default function Aziende() {
  return (
    <Pagina>
      <section className="eroe">
        <h1>Fate diventare il vostro prodotto un regalo unico</h1>
        <p>
          I vostri clienti mettono la loro foto o un messaggio sull&apos;etichetta originale del vostro prodotto, nello spazio che
          decidete voi. Per voi è gratis.
        </p>
        <div className="riga-pulsanti" style={{ justifyContent: "center" }}>
          <PulsanteLink href="/accedi">Aderisci gratis</PulsanteLink>
          <PulsanteLink href="/m/whisky" variante="secondario">
            Guarda un esempio
          </PulsanteLink>
        </div>
      </section>

      <div className="griglia griglia--tre">
        {VANTAGGI.map(([titolo, testo]) => (
          <section key={titolo} className="scheda">
            <h2 style={{ fontSize: "1.3rem" }}>{titolo}</h2>
            <p>{testo}</p>
          </section>
        ))}
      </div>

      <section className="scheda">
        <h2>Come si aderisce</h2>
        <ol className="come-funziona">
          {[
            ["Registratevi", "Bastano il nome dell'azienda, un'email e una password."],
            ["Caricate la vostra etichetta", "Quella originale, con tutte le informazioni obbligatorie."],
            ["Stabilite le regole", "Dove va la foto, se ammettete foto e/o messaggi, le parole da non usare."],
            ["Stampate il bollino sulle confezioni", "Lo scaricate già pronto: invita i clienti a inquadrare il QR."],
            ["Ricevete la vostra parte", "Per ogni etichetta acquistata dai vostri clienti."],
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
    </Pagina>
  );
}
