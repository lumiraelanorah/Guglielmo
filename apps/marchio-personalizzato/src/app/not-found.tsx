import { PulsanteLink } from "@/components/atoms/Pulsante";
import { Pagina } from "@/components/templates/Pagina";

export default function NonTrovata() {
  return (
    <Pagina stretta>
      <h1>Pagina non trovata</h1>
      <p>Il codice potrebbe essere sbagliato, oppure questa etichetta non è più disponibile.</p>
      <PulsanteLink href="/">Torna all&apos;inizio</PulsanteLink>
    </Pagina>
  );
}
