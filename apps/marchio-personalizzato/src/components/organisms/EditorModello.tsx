"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pulsante, PulsanteLink } from "@/components/atoms/Pulsante";
import { Avviso } from "@/components/atoms/Avviso";
import { Casella } from "@/components/atoms/Casella";
import { Distintivo } from "@/components/atoms/Distintivo";
import { CampoEtichettato } from "@/components/molecules/CampoEtichettato";
import { caricaImmagine } from "@/components/molecules/AnteprimaModello";
import { disegnaEtichetta, FONT_NOMI, type FontModello } from "@/lib/disegno";
import { STAMPA, RAPPORTO } from "@/lib/stampa-misure";
import { normalizzaRettangolo, POSIZIONE_INIZIALE, zonaValida, type Zona } from "@/lib/zone";
import { supabase } from "@/lib/supabase/browser";
import { useSessione } from "@/lib/supabase/sessione";
import type { Modello } from "@/lib/tipi";

type QualeZona = "foto" | "dedica" | "data";
const NOMI_ZONE: Record<QualeZona, string> = { foto: "Zona foto", dedica: "Zona dedica", data: "Zona data" };

export function EditorModello({ id }: { id: string }) {
  const s = useSessione();
  const router = useRouter();
  const tela = useRef<HTMLCanvasElement>(null);
  const [m, setM] = useState<Modello | null>(null);
  const [nonTrovato, setNonTrovato] = useState(false);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [attiva, setAttiva] = useState<QualeZona>("foto");
  const [inizio, setInizio] = useState<{ x: number; y: number } | null>(null);
  const [bozzaZona, setBozzaZona] = useState<Zona | null>(null);
  const [esempio, setEsempio] = useState(false);
  const [salvataggio, setSalvataggio] = useState(false);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore" | "attenzione"; testo: string } | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  useEffect(() => {
    if (!s.pronto || !s.utente) return;
    supabase()
      .from("marchio_modelli")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setNonTrovato(true);
        else setM(data as Modello);
      });
  }, [id, s.pronto, s.utente]);

  useEffect(() => {
    if (m?.immagine_url) caricaImmagine(m.immagine_url).then(setImg).catch(() => setImg(null));
  }, [m?.immagine_url]);

  const zone = m
    ? {
        foto: attiva === "foto" && bozzaZona ? bozzaZona : m.zona_foto,
        dedica: attiva === "dedica" && bozzaZona ? bozzaZona : m.zona_dedica,
        data: attiva === "data" && bozzaZona ? bozzaZona : m.zona_data,
      }
    : null;

  useEffect(() => {
    const ctx = tela.current?.getContext("2d");
    if (!ctx || !m || !zone) return;
    disegnaEtichetta(
      ctx,
      img,
      {
        zona_foto: zone.foto,
        zona_dedica: m.consenti_dedica ? zone.dedica : null,
        zona_data: m.consenti_data ? zone.data : null,
        font: m.font,
        colore_testo: m.colore_testo,
      },
      {
        foto: null,
        posizione: POSIZIONE_INIZIALE,
        dedica: esempio ? "Alla nonna più dolce del mondo" : "",
        data: esempio ? "25 dicembre 2026" : "",
      },
      { mostraZone: true, mostraTaglio: true, evidenzia: attiva }
    );
  });

  if (!s.pronto) return <p>Un momento…</p>;
  if (!s.utente)
    return (
      <>
        <h1>Modifica modello</h1>
        <PulsanteLink href="/accedi">Entra per continuare</PulsanteLink>
      </>
    );
  if (nonTrovato)
    return (
      <>
        <h1>Modello non trovato</h1>
        <Link href="/azienda">Torna ai tuoi modelli</Link>
      </>
    );
  if (!m) return <p>Un momento…</p>;

  const aggiorna = (campi: Partial<Modello>) => setM({ ...m, ...campi });

  function punto(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }
  function giu(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = punto(e);
    setInizio(p);
    setBozzaZona({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function muovi(e: React.PointerEvent<HTMLCanvasElement>) {
    if (inizio) setBozzaZona(normalizzaRettangolo(inizio, punto(e)));
  }
  function su(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!inizio) return;
    const z = normalizzaRettangolo(inizio, punto(e));
    setInizio(null);
    setBozzaZona(null);
    if (!zonaValida(z)) {
      setMessaggio({ tipo: "attenzione", testo: "Rettangolo troppo piccolo: trascina per disegnarlo più grande." });
      return;
    }
    setMessaggio(null);
    const chiave = attiva === "foto" ? "zona_foto" : attiva === "dedica" ? "zona_dedica" : "zona_data";
    aggiorna({ [chiave]: z } as Partial<Modello>);
  }

  async function caricaGrafica(file: File | undefined) {
    if (!file || !m || !s.utente) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) return setMessaggio({ tipo: "errore", testo: "Usa un'immagine PNG o JPG." });
    if (file.size > 10 * 1024 * 1024) return setMessaggio({ tipo: "errore", testo: "L'immagine supera i 10 MB." });
    setCaricamento(true);
    setMessaggio(null);
    try {
      const url = URL.createObjectURL(file);
      const prova = new Image();
      prova.src = url;
      await prova.decode();
      URL.revokeObjectURL(url);
      const avvisi: string[] = [];
      if (prova.width < STAMPA.larghezzaPx * 0.75 || prova.height < STAMPA.altezzaPx * 0.75)
        avvisi.push(`L'immagine è piccola (${prova.width}×${prova.height}): per una stampa nitida servono almeno ${STAMPA.larghezzaPx}×${STAMPA.altezzaPx} pixel.`);
      if (Math.abs(prova.width / prova.height - RAPPORTO) > 0.03)
        avvisi.push("Le proporzioni non sono 106×76 mm: i bordi in eccesso verranno tagliati.");
      const est = file.type === "image/png" ? "png" : "jpg";
      const percorso = `${s.utente.id}/${m.id}-${Date.now()}.${est}`;
      const sb = supabase();
      const { error } = await sb.storage.from("marchio-modelli").upload(percorso, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const pubblico = sb.storage.from("marchio-modelli").getPublicUrl(percorso).data.publicUrl;
      aggiorna({ immagine_url: pubblico });
      setMessaggio(
        avvisi.length
          ? { tipo: "attenzione", testo: `Grafica caricata. ${avvisi.join(" ")} Ricordati di salvare.` }
          : { tipo: "ok", testo: "Grafica caricata. Ora disegna le zone e salva." }
      );
    } catch {
      setMessaggio({ tipo: "errore", testo: "Caricamento non riuscito. Riprova." });
    } finally {
      setCaricamento(false);
    }
  }

  function problemi(): string[] {
    const p: string[] = [];
    if (!m) return p;
    if (!m.immagine_url) p.push("carica la grafica dell'etichetta");
    if (!zonaValida(m.zona_foto)) p.push("disegna la zona foto");
    if (m.consenti_dedica && !zonaValida(m.zona_dedica)) p.push("disegna la zona dedica (o togli la dedica)");
    if (m.consenti_data && !zonaValida(m.zona_data)) p.push("disegna la zona data (o togli la data)");
    if (m.nome_prodotto.trim().length < 2) p.push("scrivi il nome del prodotto");
    return p;
  }

  async function salva(inviaPerApprovazione: boolean) {
    if (!m) return;
    const mancano = problemi();
    if (inviaPerApprovazione && mancano.length) {
      setMessaggio({ tipo: "errore", testo: `Prima di inviarlo: ${mancano.join(", ")}.` });
      return;
    }
    setSalvataggio(true);
    const statoNuovo = inviaPerApprovazione ? "in_revisione" : m.stato === "rifiutato" ? "bozza" : m.stato;
    const { data, error } = await supabase()
      .from("marchio_modelli")
      .update({
        nome_prodotto: m.nome_prodotto.trim(),
        immagine_url: m.immagine_url,
        zona_foto: m.zona_foto,
        zona_dedica: m.zona_dedica,
        zona_data: m.zona_data,
        consenti_dedica: m.consenti_dedica,
        consenti_data: m.consenti_data,
        max_caratteri: m.max_caratteri,
        font: m.font,
        colore_testo: m.colore_testo,
        stato: statoNuovo,
      })
      .eq("id", m.id)
      .select("*")
      .single();
    setSalvataggio(false);
    if (error || !data) {
      setMessaggio({ tipo: "errore", testo: "Salvataggio non riuscito. Controlla i dati e riprova." });
      return;
    }
    setM(data as Modello);
    if (inviaPerApprovazione) router.push("/azienda");
    else setMessaggio({ tipo: "ok", testo: (data as Modello).stato === "in_revisione" && m.stato === "pubblicato" ? "Salvato. Le modifiche saranno visibili dopo l'approvazione." : "Salvato." });
  }

  return (
    <>
      <p>
        <Link href="/azienda">← I tuoi modelli</Link>
      </p>
      <h1>{m.nome_prodotto}</h1>
      <p>
        <Distintivo stato={m.stato} />
      </p>
      {m.stato === "pubblicato" ? (
        <Avviso tipo="attenzione">Questo modello è online. Se lo modifichi, torna in attesa di approvazione finché l&apos;amministratore non lo ricontrolla.</Avviso>
      ) : null}
      {m.stato === "rifiutato" && m.nota_admin ? (
        <Avviso tipo="attenzione">
          <strong>Da correggere:</strong> {m.nota_admin}
        </Avviso>
      ) : null}
      {messaggio ? <Avviso tipo={messaggio.tipo}>{messaggio.testo}</Avviso> : null}

      <div className="griglia griglia--due">
        <div>
          <div className="tela">
            <canvas
              ref={tela}
              width={STAMPA.larghezzaPx}
              height={STAMPA.altezzaPx}
              onPointerDown={giu}
              onPointerMove={muovi}
              onPointerUp={su}
              onPointerCancel={() => {
                setInizio(null);
                setBozzaZona(null);
              }}
              style={{ cursor: "crosshair" }}
              role="img"
              aria-label="Grafica del modello: trascina per disegnare la zona selezionata"
            />
          </div>
          <p className="campo__aiuto" style={{ marginTop: ".5rem" }}>
            Scegli una zona qui a destra, poi <strong>trascina sulla grafica</strong> per disegnarla. Tieni tutto dentro la linea rossa (il
            taglio) e non coprire le informazioni obbligatorie del prodotto.
          </p>
        </div>

        <div className="scheda">
          <CampoEtichettato id="nome-prodotto" etichetta="Nome del prodotto" value={m.nome_prodotto} onChange={(e) => aggiorna({ nome_prodotto: e.target.value })} />

          <div className="campo">
            <span className="campo__etichetta">Grafica dell&apos;etichetta</span>
            <span className="campo__aiuto">
              PNG o JPG, ideale {STAMPA.larghezzaPx}×{STAMPA.altezzaPx} pixel (100×70 mm + 3 mm di margine per lato, 300 dpi).
            </span>
            <div className="carica-foto">
              <span className="pulsante pulsante--secondario pulsante--largo" aria-hidden="true">
                {caricamento ? "Caricamento…" : m.immagine_url ? "Sostituisci la grafica" : "Carica la grafica"}
              </span>
              <input type="file" accept="image/png,image/jpeg" aria-label="Carica la grafica dell'etichetta" onChange={(e) => caricaGrafica(e.target.files?.[0])} />
            </div>
          </div>

          <div className="campo">
            <span className="campo__etichetta">Zona da disegnare</span>
            <div className="schede-tab" role="tablist" style={{ marginBottom: 0 }}>
              {(Object.keys(NOMI_ZONE) as QualeZona[]).map((z) => (
                <Pulsante
                  key={z}
                  piccolo
                  variante="secondario"
                  role="tab"
                  aria-selected={attiva === z}
                  onClick={() => setAttiva(z)}
                  disabled={(z === "dedica" && !m.consenti_dedica) || (z === "data" && !m.consenti_data)}
                >
                  {NOMI_ZONE[z]} {zonaValida(z === "foto" ? m.zona_foto : z === "dedica" ? m.zona_dedica : m.zona_data) ? "✓" : ""}
                </Pulsante>
              ))}
            </div>
          </div>

          <Casella id="consenti-dedica" checked={m.consenti_dedica} onChange={(v) => aggiorna({ consenti_dedica: v })}>
            Il cliente può scrivere una dedica
          </Casella>
          <Casella id="consenti-data" checked={m.consenti_data} onChange={(v) => aggiorna({ consenti_data: v })}>
            Il cliente può mettere una data
          </Casella>

          <CampoEtichettato
            id="max"
            etichetta="Lunghezza massima della dedica"
            type="number"
            min={5}
            max={60}
            value={m.max_caratteri}
            onChange={(e) => aggiorna({ max_caratteri: Math.max(5, Math.min(60, Number(e.target.value) || 5)) })}
            aiuto="Da 5 a 60 caratteri."
          />
          <div className="campo">
            <label className="campo__etichetta" htmlFor="font">
              Carattere del testo
            </label>
            <select id="font" className="campo__select" value={m.font} onChange={(e) => aggiorna({ font: e.target.value as FontModello })}>
              {(Object.keys(FONT_NOMI) as FontModello[]).map((f) => (
                <option key={f} value={f}>
                  {FONT_NOMI[f]}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label className="campo__etichetta" htmlFor="colore">
              Colore del testo
            </label>
            <input id="colore" type="color" value={m.colore_testo} onChange={(e) => aggiorna({ colore_testo: e.target.value })} style={{ width: 80, height: 52 }} />
          </div>
          <Casella id="esempio" checked={esempio} onChange={setEsempio}>
            Mostra un testo di esempio
          </Casella>

          <div className="riga-pulsanti">
            <Pulsante variante="secondario" onClick={() => salva(false)} disabled={salvataggio}>
              Salva
            </Pulsante>
            {m.stato !== "pubblicato" && m.stato !== "in_revisione" ? (
              <Pulsante onClick={() => salva(true)} disabled={salvataggio}>
                Invia per l&apos;approvazione
              </Pulsante>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
