"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pulsante } from "@/components/atoms/Pulsante";
import { Avviso } from "@/components/atoms/Avviso";
import { Casella } from "@/components/atoms/Casella";
import { CampoEtichettato } from "@/components/molecules/CampoEtichettato";
import { IndicatorePassi } from "@/components/molecules/IndicatorePassi";
import { disegnaEtichetta, FONT_CSS, type ModelloDisegno } from "@/lib/disegno";
import { misure } from "@/lib/stampa-misure";
import { controllaTesto, formattaData } from "@/lib/testo";
import { contenutoValido } from "@/lib/regole";
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
    try {
      const ridotta = await createImageBitmap(bmp, {
        resizeWidth: Math.round(bmp.width * s),
        resizeHeight: Math.round(bmp.height * s),
        resizeQuality: "high",
      });
      bmp.close();
      return ridotta;
    } catch {
      return bmp; // se il browser non riduce, usiamo l'originale
    }
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


export function EditorEtichetta({ modello, pagamentoDiProva }: { modello: ModelloPubblico; pagamentoDiProva: boolean }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const [grafica, setGrafica] = useState<HTMLImageElement | null>(null);
  const [erroreGrafica, setErroreGrafica] = useState(false);
  const [fontPronti, setFontPronti] = useState(false);
  const consentiFoto = modello.consenti_foto !== false;
  const [passo, setPasso] = useState(() => (consentiFoto ? 0 : 1));
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

  const dim = misure(modello.larghezza_mm, modello.altezza_mm);
  const verticale = dim.larghezzaPx <= dim.altezzaPx;
  const disegno: ModelloDisegno = {
    larghezza_mm: modello.larghezza_mm,
    altezza_mm: modello.altezza_mm,
    zona_foto: consentiFoto ? modello.zona_foto : null,
    zona_dedica: modello.consenti_dedica ? modello.zona_dedica : null,
    zona_data: modello.consenti_data ? modello.zona_data : null,
    font: modello.font,
    colore_testo: modello.colore_testo,
  };
  const dataTesto = formattaData(dataIso);
  const esitoDedica = controllaTesto(dedica, modello.max_caratteri, modello.parole_vietate ?? []);
  const contenuto = contenutoValido({
    consentiFoto,
    consentiDedica: modello.consenti_dedica,
    haFoto: Boolean(foto),
    dedica: modello.consenti_dedica ? dedica : "",
  });

  useEffect(() => {
    if (modello.immagine_url)
      caricaModello(modello.immagine_url)
        .then(setGrafica)
        .catch(() => setErroreGrafica(true));
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
      { filigrana: true, mostraZone: passo < 2, mostraTaglio: passo === 2, evidenzia: passo === 0 ? "foto" : passo === 1 ? "dedica" : null }
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
  const zonaPx = zonaValida(modello.zona_foto) ? zonaInPixel(modello.zona_foto, dim.larghezzaPx, dim.altezzaPx) : null;
  const scalaTela = () => {
    const r = tela.current?.getBoundingClientRect();
    return r && r.width > 0 ? dim.larghezzaPx / r.width : 1;
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
  const graficaPronta = !modello.immagine_url || Boolean(grafica);
  const puoPagare = graficaPronta && contenuto.ok && esitoDedica.ok && emailOk && consensoFoto && condizioni && !invio;

  async function paga() {
    setTentatoInvio(true);
    if (!puoPagare) return;
    setErrore(null);
    setInvio(true);
    try {
      const c = document.createElement("canvas");
      c.width = dim.larghezzaPx;
      c.height = dim.altezzaPx;
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
          conFoto: Boolean(foto),
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
  const passi = [consentiFoto ? "La foto" : null, haTesto ? "Le parole" : null, "Anteprima e pagamento"].filter(Boolean) as string[];
  const nomePasso = passo === 0 ? "La foto" : passo === 1 ? "Le parole" : "Anteprima e pagamento";

  return (
    <div>
      <IndicatorePassi passi={passi} attuale={Math.max(0, passi.indexOf(nomePasso))} />
      {erroreGrafica ? (
        <Avviso tipo="errore">
          Non riesco a caricare la grafica dell&apos;etichetta. Controlla la connessione e ricarica la pagina.
        </Avviso>
      ) : null}
      <div className="griglia griglia--due">
        <div className="tela-fissa">
          <div
            className={`tela${passo === 0 && foto ? " tela--trascina" : ""}${verticale ? " tela--verticale" : ""}`}
            style={{ aspectRatio: `${dim.larghezzaPx} / ${dim.altezzaPx}` }}
          >
            <canvas
              ref={tela}
              width={dim.larghezzaPx}
              height={dim.altezzaPx}
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
              La linea rossa tratteggiata indica dove si taglia: quello che sta fuori è il margine di sicurezza. La scritta
              &quot;Anteprima&quot; sparisce nel file che scarichi dopo il pagamento.
            </p>
          ) : null}
        </div>

        <div className="scheda">
          {passo === 0 ? (
            <section aria-labelledby="t-foto">
              <h2 id="t-foto">{passi.indexOf("La foto") + 1}. Scegli la foto</h2>
              <p>La foto va solo nello spazio evidenziato: il resto dell&apos;etichetta resta come l&apos;ha pensata il marchio.</p>
              {modello.consenti_dedica ? <p>Se preferisci, puoi anche non mettere la foto e scrivere solo un messaggio.</p> : null}
              {modello.suggerimento_foto ? (
                <p>
                  <strong>Consiglio:</strong> {modello.suggerimento_foto}
                </p>
              ) : null}
              <div className="carica-foto" style={{ marginBottom: "1rem" }}>
                <span className="pulsante pulsante--largo" aria-hidden="true">
                  {caricandoFoto ? "Sto aprendo la foto…" : foto ? "Cambia foto" : "📷 Scegli o scatta una foto"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  aria-label={foto ? "Cambia foto" : "Scegli o scatta una foto"}
                  onChange={(e) => {
                    sceltaFoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
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
                <Pulsante largo disabled={!foto && !modello.consenti_dedica} onClick={() => setPasso(haTesto ? 1 : 2)}>
                  {foto || !modello.consenti_dedica ? "Avanti" : "Continua senza foto, solo con un messaggio"}
                </Pulsante>
              </div>
            </section>
          ) : null}

          {passo === 1 ? (
            <section aria-labelledby="t-parole">
              <h2 id="t-parole">{passi.indexOf("Le parole") + 1}. Le tue parole</h2>
              <p>
                {foto
                  ? "Sono facoltative: puoi anche lasciarle vuote."
                  : "Senza foto, scrivi almeno un messaggio: sarà il protagonista dell'etichetta."}
              </p>
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
                {consentiFoto ? (
                  <Pulsante variante="secondario" onClick={() => setPasso(0)}>
                    Indietro
                  </Pulsante>
                ) : null}
                <Pulsante disabled={!esitoDedica.ok || !contenuto.ok} onClick={() => setPasso(2)}>
                  Vedi l&apos;anteprima
                </Pulsante>
              </div>
            </section>
          ) : null}

          {passo === 2 ? (
            <section aria-labelledby="t-conferma">
              <h2 id="t-conferma">{passi.length}. Controlla e paga</h2>
              <ul className="riepilogo">
                <li>
                  <span>Etichetta personalizzata</span>
                  <span>
                    {modello.larghezza_mm} × {modello.altezza_mm} mm
                  </span>
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
                <Pulsante onClick={paga} disabled={invio || !graficaPronta} aria-disabled={!puoPagare}>
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
