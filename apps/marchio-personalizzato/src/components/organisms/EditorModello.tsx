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
import { FORMATI, misure } from "@/lib/stampa-misure";
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
  const [maxTesto, setMaxTesto] = useState<string | null>(null);

  useEffect(() => {
    if (!s.pronto || !s.utente) return;
    supabase()
      .from("marchio_modelli")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setNonTrovato(true);
        else {
          const mod = data as Modello;
          // se ci sono modifiche in attesa, si riparte da quelle
          setM(mod.modifiche_in_attesa ? ({ ...mod, ...mod.modifiche_in_attesa } as Modello) : mod);
        }
      });
  }, [id, s.pronto, s.utente]);

  useEffect(() => {
    if (m?.immagine_url) caricaImmagine(m.immagine_url).then(setImg).catch(() => setImg(null));
  }, [m?.immagine_url]);

  const dim = misure(m?.larghezza_mm, m?.altezza_mm);
  const verticale = dim.larghezzaPx <= dim.altezzaPx;
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
        larghezza_mm: m.larghezza_mm,
        altezza_mm: m.altezza_mm,
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
    const conForma = attiva === "foto" && m?.zona_foto?.forma ? { ...z, forma: m.zona_foto.forma } : z;
    aggiorna({ [chiave]: conForma } as Partial<Modello>);
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
      if (prova.width < dim.larghezzaPx * 0.75 || prova.height < dim.altezzaPx * 0.75)
        avvisi.push(`L'immagine è piccola (${prova.width}×${prova.height}): per una stampa nitida servono almeno ${dim.larghezzaPx}×${dim.altezzaPx} pixel.`);
      if (Math.abs(prova.width / prova.height - dim.larghezzaPx / dim.altezzaPx) > 0.03)
        avvisi.push(`Le proporzioni non sono quelle dell'adesivo (${m.larghezza_mm + 6}×${m.altezza_mm + 6} mm con il margine): i bordi in eccesso verranno tagliati.`);
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
        suggerimento_foto: m.suggerimento_foto?.trim() || null,
        larghezza_mm: m.larghezza_mm,
        altezza_mm: m.altezza_mm,
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
    const salvato = data as Modello;
    setM(salvato.modifiche_in_attesa ? ({ ...salvato, ...salvato.modifiche_in_attesa } as Modello) : salvato);
    if (inviaPerApprovazione) router.push("/azienda");
    else
      setMessaggio({
        tipo: "ok",
        testo:
          salvato.stato === "pubblicato"
            ? "Modifiche inviate all'amministratore. Intanto resta online la versione attuale, e il QR continua a funzionare."
            : "Salvato.",
      });
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
        <Avviso>
          Questo modello è online. Le modifiche che salvi vanno all&apos;amministratore: finché non le approva resta online la versione
          attuale e il QR continua a funzionare.
        </Avviso>
      ) : null}
      {m.stato === "rifiutato" && m.nota_admin ? (
        <Avviso tipo="attenzione">
          <strong>Da correggere:</strong> {m.nota_admin}
        </Avviso>
      ) : null}
      {messaggio ? <Avviso tipo={messaggio.tipo}>{messaggio.testo}</Avviso> : null}

      <div className="griglia griglia--due">
        <div>
          <div className={`tela${verticale ? " tela--verticale" : ""}`} style={{ aspectRatio: `${dim.larghezzaPx} / ${dim.altezzaPx}` }}>
            <canvas
              ref={tela}
              width={dim.larghezzaPx}
              height={dim.altezzaPx}
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
            <label className="campo__etichetta" htmlFor="formato">
              Formato dell&apos;adesivo
            </label>
            <select
              id="formato"
              className="campo__select"
              value={`${m.larghezza_mm}x${m.altezza_mm}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split("x").map(Number);
                aggiorna({ larghezza_mm: w, altezza_mm: h });
              }}
            >
              {FORMATI.map((f) => (
                <option key={f.nome} value={`${f.larghezzaMm}x${f.altezzaMm}`}>
                  {f.nome}
                </option>
              ))}
            </select>
            <span className="campo__aiuto">Cambiando formato, controlla di nuovo le zone.</span>
          </div>
          <div className="campo">
            <span className="campo__etichetta">Grafica dell&apos;etichetta</span>
            <span className="campo__aiuto">
              PNG o JPG, ideale {dim.larghezzaPx}×{dim.altezzaPx} pixel ({m.larghezza_mm}×{m.altezza_mm} mm + 3 mm di margine per lato,
              300 dpi).
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

          <Casella
            id="foto-ovale"
            checked={m.zona_foto?.forma === "ovale"}
            onChange={(v) => m.zona_foto && aggiorna({ zona_foto: { ...m.zona_foto, forma: v ? "ovale" : "rettangolo" } })}
          >
            Foto con cornice ovale
          </Casella>
          <CampoEtichettato
            id="suggerimento"
            etichetta="Consiglio per la foto (facoltativo)"
            value={m.suggerimento_foto ?? ""}
            maxLength={140}
            onChange={(e) => aggiorna({ suggerimento_foto: e.target.value })}
            placeholder="Es. Scegli una foto in cui alzi il boccale!"
          />
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
            value={maxTesto ?? String(m.max_caratteri)}
            onChange={(e) => setMaxTesto(e.target.value)}
            onBlur={() => {
              const n = Math.round(Number(maxTesto));
              if (maxTesto !== null) aggiorna({ max_caratteri: Number.isFinite(n) ? Math.max(5, Math.min(60, n)) : m.max_caratteri });
              setMaxTesto(null);
            }}
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
