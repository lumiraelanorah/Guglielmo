import { Pagina } from "@/components/templates/Pagina";
import { ModuloAccesso } from "@/components/organisms/ModuloAccesso";

export const metadata = { title: "Area riservata – accesso" };

export default function Accedi() {
  return (
    <Pagina stretta>
      <h1>Area riservata</h1>
      <p>Per le aziende che vogliono offrire etichette personalizzate, e per l&apos;amministratore del sito.</p>
      <ModuloAccesso />
    </Pagina>
  );
}
