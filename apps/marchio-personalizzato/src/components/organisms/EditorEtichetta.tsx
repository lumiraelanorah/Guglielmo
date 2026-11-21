"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pulsante } from "@/components/atoms/Pulsante";
import { Avviso } from "@/components/atoms/Avviso";
import { Casella } from "@/components/atoms/Casella";
import { CampoEtichettato } from "@/components/molecules/CampoEtichettato";
import { IndicatorePassi } from "@/components/molecules/IndicatorePassi";
import { disegnaEtichetta, FONT_CSS, type ModelloDisegno } from "@/lib/disegno";
import { STAMPA } from "@/lib/stampa-misure";
import { controllaTesto, formattaData } from "@/lib/testo";
import { formattaPrezzo } from "@/lib/prezzo";
import { emailValida } from "@/lib/validazione";
import { limitaSpostamento, POSIZIONE_INIZIALE, zonaInPixel, zonaValida, type PosizioneFoto } from "@/lib/zone";
import type { ModelloPubblico } from "@/lib/tipi";

type Immagine = CanvasImageSource & { width: number; height: number };

const LATO_MAX_FOTO = 2400;

async function caricaFoto(file: File): Promise<Immagine> {
  if (!file.type.startsWith("image/")) throw new Error("Scegli un'immagine (JPG o PNG).");
  if (file.size > 25 * 1024 * 1024) throw new Error("La foto è troppo grande (massimo 25 MB).");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // alcuni browser non leggono certi formati con createImageBitmap
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      bmp = await createImageBitmap(img);
    } catch {
      throw new Error("Non riesco ad aprire questa foto. Prova con una foto in formato JPG o PNG.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const lato = Math.max(bmp.width, bmp.height);
  if (lato > LATO_MAX_FOTO) {
    const s = LATO_MAX_FOTO / lato;
    const ridotta = await createImageBitmap(bmp, {
      resizeWidth: Math.round(bmp.width * s),
      resizeHeight: Math.round(bmp.height * s),
      resizeQuality: "high",
    });
    bmp.close();
    return ridotta;
  }
  return bmp;
}

function caricaModello(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => ok(img);
    img.onerror = () => ko(new Error("Grafica del modello non disponibile"));
    img.src = src;
  });
}

const PASSI = ["La foto", "Le parole", "Anteprima e pagamento"];

export function EditorEtichetta({ modello, pagamentoDiProva }: { modello: ModelloPubblico; pagamentoDiProva: boolean }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const [grafica, setGrafica] = useState<HTMLImageElement | null>(null);
  const [fontPronti, setFontPronti] = useState(false);
  const [passo, setPasso] = useState(0);
  const [foto, setFoto] = useState<Immagine | null>(null);
  const [posizione, setPosizione] = useState<PosizioneFoto>(POSIZIONE_INIZIALE);
  const [erroreFoto, setErroreFoto] = useState<string | null>(null);
  const [caricandoFoto, setCaricandoFoto] = useState(false);
  const [dedica, setDedica] = useState("");
  const [dataIso, setDataIso] = useState("");
  const [email, setEmail] = useState("");
  const [consensoFoto, setConsensoFoto] = useState(false);
  const [condizioni, setCondizioni] = useState(false);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [tentatoInvio, setTentatoInvio] = useState(false);
  const anteprimaRegistrata = useRef(false);
  const puntatori = useRef(new Map<number, { x: number; y: number }>());
  const distanzaPinch = useRef<number | null>(null);

  const disegno: ModelloDisegno = {
    zona_foto: modello.zona_foto,
    zona_dedica: modello.consenti_dedica ? modello.zona_dedica : null,
    zona_data: modello.consenti_data ? modello.zona_data : null,
    font: modello.font,
    colore_testo: modello.colore_testo,
  };
  const dataTesto = formattaData(dataIso);
  const esitoDedica = controllaTesto(dedica, modello.max_caratteri);

  useEffect(() => {
    if (modello.immagine_url) caricaModello(modello.immagine_url).then(setGrafica).catch(() => setGrafica(null));
    const famiglia = FONT_CSS[modello.font].split(",")[0];
    Promise.all([document.fonts.load(`600 40px ${famiglia}`), document.fonts.load(`700 30px "Nunito"`)])
      .catch(() => undefined)
      .finally(() => setFontPronti(true));
  }, [modello.immagine_url, modello.font]);

  const ridisegna = useCallback(() => {
    const ctx = tela.current?.getContext("2d");
    if (!ctx) return;
    disegnaEtichetta(
      ctx,
      grafica,
      disegno,
      { foto, posizione, dedica: esitoDedica.ok ? dedica : "", data: dataTesto },
      { mostraZone: passo < 2, mostraTaglio: passo === 2, evidenzia: passo === 0 ? "foto" : passo === 1 ? "dedica" : null }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grafica, foto, posizione, dedica, dataTesto, passo, fontPronti, esitoDedica.ok]);

  useEffect(() => {
    const id = requestAnimationFrame(ridisegna);
    return () => cancelAnimationFrame(id);
  }, [ridisegna]);

  useEffect(() => {
    if (passo === 2 && !anteprimaRegistrata.current) {
      anteprimaRegistrata.current = true;
      fetch("/api/eventi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codice: modello.codice, tipo: "anteprima" }),
      }).catch(() => undefined);
    }
  }, [passo, modello.codice]);

  async function sceltaFoto(file: File | undefined) {
    if (!file) return;
    setErroreFoto(null);
    setCaricandoFoto(true);
    try {
      const img = await caricaFoto(file);
      setFoto(img);
      setPosizione(POSIZIONE_INIZIALE);
    } catch (e) {
      setErroreFoto(e instanceof Error ? e.message : "Foto non valida.");
    } finally {
      setCaricandoFoto(false);
    }
  }

  // --- spostamento e zoom della foto con dito o mouse ---
  const zonaPx = zonaValida(modello.zona_foto) ? zonaInPixel(modello.zona_foto, STAMPA.larghezzaPx, STAMPA.altezzaPx) : null;
  const scalaTela = () => {
    const r = tela.current?.getBoundingClientRect();
    return r && r.width > 0 ? STAMPA.larghezzaPx / r.width : 1;
  };

  function giu(e: React.PointerEvent<HTMLCanvasElement>) {
    if (passo !== 0 || !foto) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (puntatori.current.size === 2) {
      const [a, b] = [...puntatori.current.values()];
      distanzaPinch.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  function muovi(e: React.PointerEvent<HTMLCanvasElement>) {
    const prima = puntatori.current.get(e.pointerId);
    if (!prima || !foto || !zonaPx) return;
    const ora = { x: e.clientX, y: e.clientY };
    puntatori.current.set(e.pointerId, ora);
    if (puntatori.current.size === 2 && distanzaPinch.current) {
      const [a, b] = [...puntatori.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const fattore = d / distanzaPinch.current;
      distanzaPinch.current = d;
      setPosizione((p) => ({ ...p, zoom: Math.min(4, Math.max(1, p.zoom * fattore)) }));
      return;
    }
    const s = scalaTela();
    const dim = { w: foto.width, h: foto.height };
    setPosizione((p) => limitaSpostamento(zonaPx, dim, p, (ora.x - prima.x) * s, (ora.y - prima.y) * s));
  }
  function su(e: React.PointerEvent<HTMLCanvasElement>) {
    puntatori.current.delete(e.pointerId);
    if (puntatori.current.size < 2) distanzaPinch.current = null;
  }
  function tasti(e: React.KeyboardEvent<HTMLCanvasElement>) {
    if (passo !== 0 || !foto || !zonaPx) return;
    const passoPx = 20;
    const mosse: Record<string, [number, number]> = {
      ArrowLeft: [-passoPx, 0],
      ArrowRight: [passoPx, 0],
      ArrowUp: [0, -passoPx],
      ArrowDown: [0, passoPx],
    };
    const m = mosse[e.key];
    if (m) {
      e.preventDefault();
      const dim = { w: foto.width, h: foto.height };
      setPosizione((p) => limitaSpostamento(zonaPx, dim, p, m[0], m[1]));
    }
  }

  const emailOk = emailValida(email);
  const puoPagare = Boolean(foto) && esitoDedica.ok && emailOk && consensoFoto && condizioni && !invio;

  async function paga() {
    setTentatoInvio(true);
    if (!puoPagare) return;
    setErrore(null);
    setInvio(true);
    try {
      const c = document.createElement("canvas");
      c.width = STAMPA.larghezzaPx;
      c.height = STAMPA.altezzaPx;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Il tuo browser non riesce a preparare l'immagine.");
      disegnaEtichetta(ctx, grafica, disegno, { foto, posizione, dedica, data: dataTesto }, {});
      let jpeg = c.toDataURL("image/jpeg", 0.92);
      if (jpeg.length > 3_800_000) jpeg = c.toDataURL("image/jpeg", 0.8);
      const r = await fetch("/api/ordini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codice: modello.codice,
          immagine: jpeg,
          dedica: modello.consenti_dedica ? dedica.trim() : "",
          data: modello.consenti_data ? dataTesto : "",
          email: email.trim(),
          consensoFoto,
          condizioni,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.errore ?? "Non è stato possibile procedere. Riprova tra poco.");
      window.location.assign(j.url);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto. Riprova.");
      setInvio(false);
    }
  }

  const haTesto = modello.consenti_dedica || modello.consenti_data;

  return (
    <div>
      <IndicatorePassi passi={PASSI} attuale={passo} />
      <div className="griglia griglia--due">
        <div className="tela-fissa">
          <div className={`tela${passo === 0 && foto ? " tela--trascina" : ""}`}>
            <canvas
              ref={tela}
              width={STAMPA.larghezzaPx}
              height={STAMPA.altezzaPx}
              role="img"
              aria-label={`Anteprima dell'etichetta di ${modello.nome_prodotto}${foto ? " con la tua foto" : ""}${passo === 0 && foto ? ". Usa le frecce per spostare la foto." : ""}`}
              tabIndex={passo === 0 && foto ? 0 : -1}
              onPointerDown={giu}
              onPointerMove={muovi}
              onPointerUp={su}
              onPointerCancel={su}
              onKeyDown={tasti}
              data-testid="tela-etichetta"
            />
            {passo === 0 && foto ? <span className="tela__suggerimento">Trascina la foto per spostarla</span> : null}
          </div>
          {passo === 2 ? (
            <p className="campo__aiuto" style={{ marginTop: ".5rem" }}>
              La linea rossa tratteggiata indica dove si taglia: quello che sta fuori è il margine di sicurezza.
            </p>
          ) : null}
        </div>

        <div className="scheda">
          {passo === 0 ? (
            <section aria-labelledby="t-foto">
              <h2 id="t-foto">1. Scegli la foto</h2>
              <p>La foto va solo nello spazio evidenziato: il resto dell&apos;etichetta resta come l&apos;ha pensata il marchio.</p>
              <div className="carica-foto" style={{ marginBottom: "1rem" }}>
                <span className="pulsante pulsante--largo" aria-hidden="true">
                  {caricandoFoto ? "Sto aprendo la foto…" : foto ? "Cambia foto" : "📷 Scegli o scatta una foto"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  aria-label={foto ? "Cambia foto" : "Scegli o scatta una foto"}
                  onChange={(e) => sceltaFoto(e.target.files?.[0])}
                  data-testid="scegli-foto"
                />
              </div>
              {erroreFoto ? <Avviso tipo="errore">{erroreFoto}</Avviso> : null}
              {foto ? (
                <>
                  <label className="campo__etichetta" htmlFor="zoom">
                    Ingrandisci
                  </label>
                  <input
                    id="zoom"
                    className="cursore"
                    type="range"
                    min={1}
                    max={4}
                    step={0.01}
                    value={posizione.zoom}
                    onChange={(e) => setPosizione((p) => ({ ...p, zoom: Number(e.target.value) }))}
                  />
                  <p className="campo__aiuto">Trascina la foto sull&apos;etichetta per scegliere cosa si vede. Con due dita puoi ingrandire.</p>
                  <div className="riga-pulsanti">
                    <Pulsante variante="secondario" piccolo onClick={() => setPosizione(POSIZIONE_INIZIALE)}>
                      Rimetti al centro
                    </Pulsante>
                  </div>
                </>
              ) : null}
              <div style={{ marginTop: "1.5rem" }}>
                <Pulsante largo disabled={!foto} onClick={() => setPasso(haTesto ? 1 : 2)}>
                  Avanti
                </Pulsante>
              </div>
            </section>
          ) : null}

          {passo === 1 ? (
            <section aria-labelledby="t-parole">
              <h2 id="t-parole">2. Le tue parole</h2>
              <p>Sono facoltative: puoi anche lasciarle vuote.</p>
              {modello.consenti_dedica ? (
                <CampoEtichettato
                  id="dedica"
                  etichetta="Dedica"
                  aiuto={`Breve, al massimo ${modello.max_caratteri} caratteri.`}
                  value={dedica}
                  maxLength={modello.max_caratteri + 10}
                  onChange={(e) => setDedica(e.target.value)}
                  errore={esitoDedica.ok ? null : esitoDedica.errore}
                  contatore={{ attuale: dedica.trim().length, massimo: modello.max_caratteri }}
                  placeholder="Es. Alla nonna più dolce del mondo"
                />
              ) : null}
              {modello.consenti_data ? (
                <CampoEtichettato
                  id="data"
                  etichetta="Data"
                  aiuto={dataTesto ? `Sull'etichetta: ${dataTesto}` : "Per esempio il giorno della festa."}
                  type="date"
                  value={dataIso}
                  onChange={(e) => setDataIso(e.target.value)}
                />
              ) : null}
              <div className="riga-pulsanti">
                <Pulsante variante="secondario" onClick={() => setPasso(0)}>
                  Indietro
                </Pulsante>
                <Pulsante disabled={!esitoDedica.ok} onClick={() => setPasso(2)}>
                  Vedi l&apos;anteprima
                </Pulsante>
              </div>
            </section>
          ) : null}

          {passo === 2 ? (
            <section aria-labelledby="t-conferma">
              <h2 id="t-conferma">3. Controlla e paga</h2>
              <ul className="riepilogo">
                <li>
                  <span>Etichetta personalizzata</span>
                  <span>100 × 70 mm</span>
                </li>
                <li>
                  <span>File da stampare</span>
                  <span>PDF + immagine</span>
                </li>
                <li>
                  <strong>Totale</strong>
                  <span className="prezzo">{formattaPrezzo(modello.prezzo_cent)}</span>
                </li>
              </ul>
              <CampoEtichettato
                id="email"
                etichetta="La tua email"
                aiuto="Ti mandiamo la ricevuta e il link per scaricare di nuovo il file."
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                errore={tentatoInvio && !emailOk ? "Scrivi un indirizzo email valido." : null}
              />
              <Casella id="consenso-foto" checked={consensoFoto} onChange={setConsensoFoto}>
                La foto è mia, oppure ho il permesso delle persone che ci sono.
              </Casella>
              <Casella id="condizioni" checked={condizioni} onChange={setCondizioni}>
                Accetto le{" "}
                <a href="/condizioni" target="_blank" rel="noopener">
                  condizioni e l&apos;informativa privacy
                </a>
                .
              </Casella>
              {tentatoInvio && (!consensoFoto || !condizioni) ? (
                <Avviso tipo="errore">Per continuare spunta le due caselle qui sopra.</Avviso>
              ) : null}
              {errore ? <Avviso tipo="errore">{errore}</Avviso> : null}
              {pagamentoDiProva ? (
                <Avviso tipo="attenzione">Questo sito è in prova: il pagamento è simulato e non ti verrà addebitato nulla.</Avviso>
              ) : null}
              <div className="riga-pulsanti">
                <Pulsante variante="secondario" onClick={() => setPasso(haTesto ? 1 : 0)} disabled={invio}>
                  Indietro
                </Pulsante>
                <Pulsante onClick={paga} disabled={invio} aria-disabled={!puoPagare}>
                  {invio ? "Un momento…" : `Paga ${formattaPrezzo(modello.prezzo_cent)}`}
                </Pulsante>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
