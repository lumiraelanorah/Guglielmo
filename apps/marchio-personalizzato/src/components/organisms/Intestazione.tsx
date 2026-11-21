import Link from "next/link";
import { TEMI, type NomeTema } from "@/lib/temi";

export function Intestazione({ tema }: { tema: NomeTema }) {
  const t = TEMI[tema];
  return (
    <header className="intestazione">
      <div className="contenitore intestazione__riga">
        <Link href="/" className="intestazione__logo">
          <span className="intestazione__simbolo" aria-hidden="true">
            {t.simbolo}
          </span>
          Etichetta Tua
        </Link>
        <nav className="intestazione__menu" aria-label="Menu principale">
          <Link href="/m/prova">Prova ora</Link>
          <Link href="/aziende">Per le aziende</Link>
          <span className="intestazione__tema" aria-label={`Tema: ${t.nome}`}>
            {t.nome}
          </span>
        </nav>
      </div>
    </header>
  );
}
