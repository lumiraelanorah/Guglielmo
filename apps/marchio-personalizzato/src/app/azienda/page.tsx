import { Pagina } from "@/components/templates/Pagina";
import { AreaAzienda } from "@/components/organisms/AreaAzienda";

export const metadata = { title: "Area aziende" };

export default function PaginaAzienda() {
  return (
    <Pagina>
      <AreaAzienda />
    </Pagina>
  );
}
