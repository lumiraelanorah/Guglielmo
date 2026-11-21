"use client";

import { useState } from "react";
import { Pulsante } from "@/components/atoms/Pulsante";

/** Azione delicata: il primo tocco chiede conferma, il secondo esegue. */
export function PulsanteConferma({ testo, conferma, onConferma, disabled }: { testo: string; conferma: string; onConferma: () => void; disabled?: boolean }) {
  const [chiedi, setChiedi] = useState(false);
  if (!chiedi) {
    return (
      <Pulsante variante="secondario" piccolo onClick={() => setChiedi(true)} disabled={disabled}>
        {testo}
      </Pulsante>
    );
  }
  return (
    <span className="riga-pulsanti" style={{ gap: ".5rem" }}>
      <Pulsante
        variante="pericolo"
        piccolo
        onClick={() => {
          setChiedi(false);
          onConferma();
        }}
      >
        {conferma}
      </Pulsante>
      <Pulsante variante="secondario" piccolo onClick={() => setChiedi(false)}>
        No
      </Pulsante>
    </span>
  );
}
