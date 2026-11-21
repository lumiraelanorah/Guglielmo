"use client";

import { useState } from "react";
import { Pulsante } from "@/components/atoms/Pulsante";
import { Avviso } from "@/components/atoms/Avviso";

export function ConfermaPagamentoProva({ id, token, importo }: { id: string; token: string; importo: string }) {
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function conferma() {
    setAttesa(true);
    setErrore(null);
    try {
      const r = await fetch("/api/pagamento-prova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, t: token }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.errore ?? "Qualcosa non ha funzionato. Riprova.");
      window.location.assign(j.url);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      setAttesa(false);
    }
  }

  return (
    <>
      {errore ? <Avviso tipo="errore">{errore}</Avviso> : null}
      <Pulsante largo onClick={conferma} disabled={attesa}>
        {attesa ? "Sto confermando…" : `Conferma il pagamento di prova (${importo})`}
      </Pulsante>
    </>
  );
}
