import { Pagina } from "@/components/templates/Pagina";
import { AreaAdmin } from "@/components/organisms/AreaAdmin";

export const metadata = { title: "Amministrazione", robots: { index: false } };

export default function PaginaAdmin() {
  return (
    <Pagina>
      <AreaAdmin />
    </Pagina>
  );
}
