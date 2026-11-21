import Link from "next/link";

export function PiePagina() {
  return (
    <footer className="piede">
      <div className="contenitore">
        <p className="motto">Il prodotto appartiene al marchio. La storia appartiene a chi lo sceglie.</p>
        <p>
          <Link href="/condizioni">Condizioni e privacy</Link> · <Link href="/azienda">Area aziende</Link> ·{" "}
          <Link href="/admin">Amministrazione</Link>
        </p>
        <p>Foto e file vengono cancellati automaticamente dopo 30 giorni.</p>
      </div>
    </footer>
  );
}
