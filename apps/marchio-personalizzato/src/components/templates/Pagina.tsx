import type { ReactNode } from "react";

export function Pagina({ children, stretta }: { children: ReactNode; stretta?: boolean }) {
  return (
    <main id="contenuto" className="principale">
      <div className="contenitore" style={stretta ? { maxWidth: 720 } : undefined}>
        {children}
      </div>
    </main>
  );
}
