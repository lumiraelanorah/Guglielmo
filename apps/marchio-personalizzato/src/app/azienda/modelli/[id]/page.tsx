import { Pagina } from "@/components/templates/Pagina";
import { EditorModello } from "@/components/organisms/EditorModello";

export const metadata = { title: "Modifica modello" };

export default async function PaginaEditorModello({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Pagina>
      <EditorModello id={id} />
    </Pagina>
  );
}
