export function IndicatorePassi({ passi, attuale }: { passi: string[]; attuale: number }) {
  return (
    <ol className="passi" aria-label="Passaggi">
      {passi.map((p, i) => (
        <li key={p} aria-current={i === attuale ? "step" : undefined} className={i < attuale ? "passi__fatto" : undefined}>
          {i < attuale ? "✓ " : `${i + 1}. `}
          {p}
        </li>
      ))}
    </ol>
  );
}
