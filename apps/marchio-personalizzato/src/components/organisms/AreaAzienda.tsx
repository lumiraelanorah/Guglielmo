"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pulsante, PulsanteLink } from "@/components/atoms/Pulsante";
import { Avviso } from "@/components/atoms/Avviso";
import { Distintivo } from "@/components/atoms/Distintivo";
import { CampoEtichettato } from "@/components/molecules/CampoEtichettato";
import { Statistiche } from "@/components/molecules/Statistiche";
import { PulsanteConferma } from "@/components/molecules/PulsanteConferma";
import { AnteprimaModello } from "@/components/molecules/AnteprimaModello";
import { supabase } from "@/lib/supabase/browser";
import { esci, useSessione } from "@/lib/supabase/sessione";
import { formattaPrezzo } from "@/lib/prezzo";
import type { Modello } from "@/lib/tipi";

type Stat = { scansioni: number; anteprime: number; acquisti: number };

function SchedaModello({ m, onCambia }: { m: Modello; onCambia: () => void }) {
  const [stat, setStat] = useState<Stat | null>(null);
  const [origine, setOrigine] = useState("");
  useEffect(() => {
    setOrigine(window.location.origin);
    supabase()
      .rpc("marchio_statistiche", { p_modello_id: m.id })
      .then(({ data }) => {
        const r = (data as Stat[] | null)?.[0];
        if (r) setStat({ scansioni: Number(r.scansioni), anteprime: Number(r.anteprime), acquisti: Number(r.acquisti) });
      });
  }, [m.id]);

  const [erroreElimina, setErroreElimina] = useState<string | null>(null);
  async function elimina() {
    const { error, count } = await supabase().from("marchio_modelli").delete({ count: "exact" }).eq("id", m.id);
    if (error || count === 0) {
      setErroreElimina("Non si può eliminare: ci sono etichette vendute negli ultimi 30 giorni che i clienti possono ancora scaricare.");
      return;
    }
    onCambia();
  }

  const link = `${origine}/m/${m.codice}`;
  return (
    <article className="scheda">
      <div className="griglia griglia--due">
        <AnteprimaModello
          immagine={m.immagine_url}
          modello={{ zona_foto: m.zona_foto, zona_dedica: m.consenti_dedica ? m.zona_dedica : null, zona_data: m.consenti_data ? m.zona_data : null, font: m.font, colore_testo: m.colore_testo }}
        />
        <div>
          <h3>{m.nome_prodotto}</h3>
          <p>
            <Distintivo stato={m.stato} /> · {formattaPrezzo(m.prezzo_cent)} per etichetta
          </p>
          {m.stato === "rifiutato" && m.nota_admin ? (
            <Avviso tipo="attenzione">
              <strong>Da correggere:</strong> {m.nota_admin}
            </Avviso>
          ) : null}
          {m.stato === "in_revisione" ? <p className="campo__aiuto">L&apos;amministratore lo controllerà a breve.</p> : null}
          {m.stato === "pubblicato" && m.modifiche_in_attesa ? (
            <Avviso>Hai inviato delle modifiche: finché l&apos;amministratore non le approva resta online la versione attuale.</Avviso>
          ) : null}
          {erroreElimina ? <Avviso tipo="errore">{erroreElimina}</Avviso> : null}
          {stat ? <Statistiche {...stat} /> : null}
          {m.stato === "pubblicato" ? (
            <div style={{ marginTop: "1rem" }}>
              <p>
                Link per i clienti: <a href={link}>{link}</a>
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="qr" src={`/api/qr?codice=${m.codice}`} alt={`Codice QR che apre ${link}`} />
              <p>
                <PulsanteLink href={`/api/qr?codice=${m.codice}&scarica=1`} download piccolo variante="secondario">
                  Scarica il QR da stampare
                </PulsanteLink>
              </p>
            </div>
          ) : null}
          <div className="riga-pulsanti" style={{ marginTop: "1rem" }}>
            <PulsanteLink href={`/azienda/modelli/${m.id}`} piccolo>
              {m.stato === "pubblicato" ? "Modifica" : "Completa / modifica"}
            </PulsanteLink>
            {m.stato !== "pubblicato" ? <PulsanteConferma testo="Elimina" conferma="Sì, elimina" onConferma={elimina} /> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function AreaAzienda() {
  const s = useSessione();
  const router = useRouter();
  const [modelli, setModelli] = useState<Modello[] | null>(null);
  const [nome, setNome] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [nomeAzienda, setNomeAzienda] = useState("");

  async function registraAzienda(e: React.FormEvent) {
    e.preventDefault();
    if (nomeAzienda.trim().length < 2) return setErrore("Scrivi il nome dell'azienda.");
    const { error } = await supabase().rpc("marchio_registra_azienda", { p_nome: nomeAzienda.trim() });
    if (error) return setErrore("Registrazione non riuscita. Riprova.");
    setErrore(null);
    s.ricarica();
  }

  const carica = useCallback(async () => {
    if (!s.azienda) return;
    const { data } = await supabase().from("marchio_modelli").select("*").eq("azienda_id", s.azienda.id).order("creato_il", { ascending: false });
    setModelli((data as Modello[]) ?? []);
  }, [s.azienda]);

  useEffect(() => {
    carica();
  }, [carica]);

  async function nuovo(e: React.FormEvent) {
    e.preventDefault();
    if (!s.azienda) return;
    if (nome.trim().length < 2) return setErrore("Scrivi il nome del prodotto.");
    const { data, error } = await supabase()
      .from("marchio_modelli")
      .insert({ azienda_id: s.azienda.id, nome_prodotto: nome.trim() })
      .select("id")
      .single();
    if (error || !data) return setErrore("Non è stato possibile creare il modello.");
    router.push(`/azienda/modelli/${data.id}`);
  }

  if (!s.pronto) return <p>Un momento…</p>;
  if (!s.utente) {
    return (
      <>
        <h1>Area aziende</h1>
        <p>Entra per gestire i modelli delle tue etichette.</p>
        <PulsanteLink href="/accedi">Entra o registrati</PulsanteLink>
      </>
    );
  }
  if (!s.azienda) {
    return (
      <>
        <h1>Area aziende</h1>
        {s.admin ? (
          <p>
            Sei collegato come amministratore. <Link href="/admin">Vai all&apos;amministrazione</Link>.
          </p>
        ) : !s.utente.email_confirmed_at ? (
          <Avviso tipo="attenzione">Conferma la tua email per completare la registrazione, poi ricarica la pagina.</Avviso>
        ) : (
          <form onSubmit={registraAzienda} className="scheda">
            <h2>Registra la tua azienda</h2>
            <CampoEtichettato id="nome-azienda" etichetta="Nome dell'azienda" value={nomeAzienda} onChange={(e) => setNomeAzienda(e.target.value)} errore={errore} />
            <Pulsante type="submit">Registra</Pulsante>
          </form>
        )}
        <Pulsante variante="secondario" onClick={esci}>
          Esci
        </Pulsante>
      </>
    );
  }

  return (
    <>
      <div className="riga-pulsanti" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>{s.azienda.nome}</h1>
        <div className="riga-pulsanti">
          {s.admin ? <PulsanteLink href="/admin" variante="secondario" piccolo>Amministrazione</PulsanteLink> : null}
          <Pulsante variante="secondario" piccolo onClick={esci}>
            Esci
          </Pulsante>
        </div>
      </div>
      <p style={{ marginTop: "1rem" }}>
        Stato dell&apos;azienda: <Distintivo stato={s.azienda.approvata ? "si" : "no"} />
      </p>
      {!s.azienda.approvata ? (
        <Avviso>
          Puoi già preparare i tuoi modelli. Andranno online quando l&apos;amministratore avrà approvato l&apos;azienda e il modello.
        </Avviso>
      ) : null}

      <section className="scheda">
        <h2>Nuovo modello di etichetta</h2>
        <form onSubmit={nuovo} className="riga-pulsanti" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 260px" }}>
            <CampoEtichettato id="nome-prodotto" etichetta="Nome del prodotto" value={nome} onChange={(e) => setNome(e.target.value)} errore={errore} placeholder="Es. Panettone classico 750 g" />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <Pulsante type="submit">Crea</Pulsante>
          </div>
        </form>
      </section>

      <h2>I tuoi modelli</h2>
      {modelli === null ? <p>Un momento…</p> : modelli.length === 0 ? <p>Non hai ancora creato modelli.</p> : null}
      {modelli?.map((m) => <SchedaModello key={m.id} m={m} onCambia={carica} />)}
    </>
  );
}
