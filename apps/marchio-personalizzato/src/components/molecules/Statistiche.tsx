export function Statistiche({ scansioni, anteprime, acquisti }: { scansioni: number; anteprime: number; acquisti: number }) {
  return (
    <div className="statistiche" aria-label="Statistiche">
      <div>
        <strong>{scansioni}</strong>visite dal QR
      </div>
      <div>
        <strong>{anteprime}</strong>anteprime
      </div>
      <div>
        <strong>{acquisti}</strong>acquisti
      </div>
    </div>
  );
}
