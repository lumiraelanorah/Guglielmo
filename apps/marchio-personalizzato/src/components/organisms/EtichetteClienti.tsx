"use client";

import { useCallback, useEffect, useState } from "react";
import { Pulsante } from "@/components/atoms/Pulsante";
import { Distintivo } from "@/components/atoms/Distintivo";
import { PulsanteConferma } from "@/components/molecules/PulsanteConferma";
import { supabase } from "@/lib/supabase/browser";

interface Etichetta {
  id: string;
  stato: string;
  dedica: string | null;
  data_testo: string | null;
  con_foto: boolean;
  da_controllare: boolean;
  pagata_il: string | null;
}

/** Le etichette create dai clienti per un prodotto: la casa produttrice le vede e può ritirarle. */
export function EtichetteClienti({ modelloId }: { modelloId: string }) {
  const [aperto, setAperto] = useState(false);
  const [elenco, setElenco] = useState<Etichetta[] | null>(null);
  const [immagini, setImmagini] = useState<Record<string, string>>({});

  const carica = useCallback(async () => {
    const { data } = await supabase().rpc("marchio_etichette_azienda", { p_modello_id: modelloId });
    setElenco((data as Etichetta[]) ?? []);
  }, [modelloId]);

  useEffect(() => {
    if (aperto) carica();
  }, [aperto, carica]);

  async function vedi(id: string) {
    const { data } = await supabase().rpc("marchio_immagine_etichetta", { p_id: id });
    if (typeof data === "string" && data) setImmagini((m) => ({ ...m, [id]: `data:image/jpeg;base64,${data}` }));
  }
  async function ritira(id: string) {
    await supabase().rpc("marchio_ritira_etichetta", { p_id: id });
    setImmagini((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
    carica();
  }

  if (!aperto) {
    return (
      <Pulsante piccolo variante="secondario" onClick={() => setAperto(true)}>
        Vedi le etichette dei clienti
      </Pulsante>
    );
  }
  return (
    <section style={{ marginTop: "1rem" }}>
      <h4>Etichette dei clienti</h4>
      <p className="campo__aiuto">
        Sono approvate in automatico se rispettano le vostre regole. Se una non vi piace, ritiratela: il cliente non potrà più
        scaricarla.
      </p>
      {elenco === null ? <p>Un momento…</p> : elenco.length === 0 ? <p>Ancora nessuna etichetta venduta.</p> : null}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {elenco?.map((e) => (
          <li key={e.id} style={{ borderBottom: "1px solid var(--colore-bordo)", padding: ".6rem 0" }}>
            <div>
              {e.pagata_il ? new Date(e.pagata_il).toLocaleDateString("it-IT") : "—"} · {e.con_foto ? "con foto" : "solo messaggio"}{" "}
              <Distintivo stato={e.stato} /> {e.da_controllare ? <Distintivo stato="attesa" /> : null}
            </div>
            {e.dedica ? <div>&ldquo;{e.dedica}&rdquo;</div> : null}
            {immagini[e.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="miniatura" src={immagini[e.id]} alt="Etichetta del cliente" style={{ marginTop: ".5rem" }} />
            ) : null}
            {e.stato !== "rimossa" ? (
              <div className="riga-pulsanti" style={{ marginTop: ".5rem" }}>
                {!immagini[e.id] ? (
                  <Pulsante piccolo variante="secondario" onClick={() => vedi(e.id)}>
                    Vedi
                  </Pulsante>
                ) : null}
                <PulsanteConferma testo="Ritira" conferma="Sì, ritirala" onConferma={() => ritira(e.id)} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
