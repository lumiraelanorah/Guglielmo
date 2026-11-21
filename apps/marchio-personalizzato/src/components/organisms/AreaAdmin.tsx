"use client";

import { useCallback, useEffect, useState } from "react";
import { Pulsante, PulsanteLink } from "@/components/atoms/Pulsante";
import { Avviso } from "@/components/atoms/Avviso";
import { Distintivo } from "@/components/atoms/Distintivo";
import { Casella } from "@/components/atoms/Casella";
import { CampoEtichettato } from "@/components/molecules/CampoEtichettato";
import { PulsanteConferma } from "@/components/molecules/PulsanteConferma";
import { AnteprimaModello } from "@/components/molecules/AnteprimaModello";
import { supabase } from "@/lib/supabase/browser";
import { esci, useSessione } from "@/lib/supabase/sessione";
import { CALENDARIO_PREDEFINITO, eNomeTema, NOMI_TEMI, temaAttivo, TEMI, type NomeTema, type VoceCalendario } from "@/lib/temi";
import { formattaPrezzo } from "@/lib/prezzo";
import { emailValida } from "@/lib/validazione";
import type { Azienda, Modello } from "@/lib/tipi";

type Scheda = "tema" | "modelli" | "aziende" | "ordini" | "admin";
const SCHEDE: Record<Scheda, string> = { tema: "Tema del sito", modelli: "Modelli", aziende: "Aziende", ordini: "Etichette vendute", admin: "Amministratori" };

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const data = (s: string | null) => (s ? new Date(s).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) : "—");

/* ------------------------------ Tema ------------------------------ */
function PannelloTema() {
  const [manuale, setManuale] = useState<NomeTema | "">("");
  const [calendario, setCalendario] = useState<VoceCalendario[]>(CALENDARIO_PREDEFINITO);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  useEffect(() => {
    supabase()
      .from("marchio_impostazioni")
      .select("tema_manuale,calendario")
      .eq("id", 1)
      .single()
      .then(({ data: r }) => {
        if (!r) return;
        setManuale(eNomeTema(r.tema_manuale) ? r.tema_manuale : "");
        const cal = r.calendario as VoceCalendario[];
        // una riga per ogni tema, nell'ordine dei temi
        setCalendario(NOMI_TEMI.map((t) => cal.find((v) => v.tema === t) ?? CALENDARIO_PREDEFINITO.find((v) => v.tema === t)!));
      });
  }, []);

  const oggi = temaAttivo(new Date(), calendario, manuale || null);

  function cambiaData(tema: NomeTema, parte: "mese" | "giorno", valore: string) {
    setCalendario((c) =>
      c.map((v) => {
        if (v.tema !== tema) return v;
        const [mm, gg] = v.dal.split("-");
        return { ...v, dal: parte === "mese" ? `${valore}-${gg}` : `${mm}-${valore}` };
      })
    );
  }

  async function salva() {
    const { error } = await supabase()
      .from("marchio_impostazioni")
      .update({ tema_manuale: manuale || null, calendario, aggiornato_il: new Date().toISOString() })
      .eq("id", 1);
    setMsg(error ? { tipo: "errore", testo: "Salvataggio non riuscito." } : { tipo: "ok", testo: "Salvato. Il sito cambierà aspetto entro un minuto." });
  }

  return (
    <section className="scheda">
      <h2>Tema del sito</h2>
      <p>
        Oggi il sito usa il tema: <strong>{TEMI[oggi].simbolo} {TEMI[oggi].nome}</strong>
      </p>
      {msg ? <Avviso tipo={msg.tipo}>{msg.testo}</Avviso> : null}
      <div className="campo">
        <label className="campo__etichetta" htmlFor="tema-manuale">
          Scelta del tema
        </label>
        <select id="tema-manuale" className="campo__select" value={manuale} onChange={(e) => setManuale(e.target.value as NomeTema | "")}>
          <option value="">Automatico, secondo il calendario qui sotto</option>
          {NOMI_TEMI.map((t) => (
            <option key={t} value={t}>
              Sempre {TEMI[t].nome}
            </option>
          ))}
        </select>
      </div>
      <h3>Calendario automatico</h3>
      <p className="campo__aiuto">Ogni tema parte dal giorno indicato e resta fino all&apos;inizio del tema successivo.</p>
      <div className="tabella-scorre">
        <table className="tabella">
          <thead>
            <tr>
              <th>Tema</th>
              <th>Dal giorno</th>
              <th>Mese</th>
            </tr>
          </thead>
          <tbody>
            {calendario.map((v) => {
              const [mm, gg] = v.dal.split("-");
              return (
                <tr key={v.tema}>
                  <td>
                    {TEMI[v.tema].simbolo} {TEMI[v.tema].nome}
                  </td>
                  <td>
                    <select aria-label={`Giorno di inizio ${TEMI[v.tema].nome}`} className="campo__select" value={gg} onChange={(e) => cambiaData(v.tema, "giorno", e.target.value)}>
                      {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((g) => (
                        <option key={g} value={g}>
                          {Number(g)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select aria-label={`Mese di inizio ${TEMI[v.tema].nome}`} className="campo__select" value={mm} onChange={(e) => cambiaData(v.tema, "mese", e.target.value)}>
                      {MESI.map((n, i) => (
                        <option key={n} value={String(i + 1).padStart(2, "0")}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="riga-pulsanti" style={{ marginTop: "1rem" }}>
        <Pulsante onClick={salva}>Salva il tema</Pulsante>
        <Pulsante variante="secondario" onClick={() => setCalendario(CALENDARIO_PREDEFINITO)}>
          Ripristina il calendario iniziale
        </Pulsante>
      </div>
    </section>
  );
}

/* ----------------------------- Modelli ----------------------------- */
type ModelloAdmin = Modello & { marchio_aziende: { nome: string; approvata: boolean } | null };

function PannelloModelli() {
  const [modelli, setModelli] = useState<ModelloAdmin[] | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const carica = useCallback(async () => {
    const { data: r } = await supabase()
      .from("marchio_modelli")
      .select("*, marchio_aziende(nome, approvata)")
      .neq("stato", "bozza")
      .order("aggiornato_il", { ascending: false });
    const urgente = (m: ModelloAdmin) => Number(m.stato === "in_revisione" || Boolean(m.modifiche_in_attesa));
    const lista = ((r as ModelloAdmin[]) ?? []).sort((a, b) => urgente(b) - urgente(a));
    setModelli(lista);
  }, []);
  useEffect(() => {
    carica();
  }, [carica]);

  async function cambia(m: ModelloAdmin, stato: "pubblicato" | "rifiutato") {
    const nota = stato === "rifiutato" ? (note[m.id] ?? "").trim() || "Il modello va corretto." : null;
    const { error } = await supabase().from("marchio_modelli").update({ stato, nota_admin: nota }).eq("id", m.id);
    setMsg(error ? "Operazione non riuscita." : stato === "pubblicato" ? `"${m.nome_prodotto}" è online.` : `"${m.nome_prodotto}" rimandato all'azienda.`);
    carica();
  }

  async function modifiche(m: ModelloAdmin, approva: boolean) {
    const campi = approva && m.modifiche_in_attesa ? { ...m.modifiche_in_attesa } : {};
    const nota = approva ? null : (note[m.id] ?? "").trim() || "Le modifiche proposte non sono state approvate.";
    const { error } = await supabase()
      .from("marchio_modelli")
      .update({ ...campi, modifiche_in_attesa: null, nota_admin: nota })
      .eq("id", m.id);
    setMsg(error ? "Operazione non riuscita." : approva ? `Modifiche di "${m.nome_prodotto}" pubblicate.` : "Modifiche scartate.");
    carica();
  }

  if (!modelli) return <p>Un momento…</p>;
  return (
    <section>
      <h2>Modelli</h2>
      {msg ? <Avviso tipo="ok">{msg}</Avviso> : null}
      {modelli.length === 0 ? <p>Nessun modello da controllare.</p> : null}
      {modelli.map((m) => (
        <article key={m.id} className="scheda">
          <div className="griglia griglia--due">
            <AnteprimaModello
              immagine={m.immagine_url}
              modello={{ larghezza_mm: m.larghezza_mm, altezza_mm: m.altezza_mm, zona_foto: m.zona_foto, zona_dedica: m.consenti_dedica ? m.zona_dedica : null, zona_data: m.consenti_data ? m.zona_data : null, font: m.font, colore_testo: m.colore_testo }}
              esempio={{ dedica: m.consenti_dedica ? "Esempio di dedica" : "", data: m.consenti_data ? "25 dicembre 2026" : "" }}
            />
            <div>
              <h3>{m.nome_prodotto}</h3>
              <p>
                {m.marchio_aziende?.nome ?? "—"} {m.marchio_aziende && !m.marchio_aziende.approvata ? <Distintivo stato="no" /> : null}
              </p>
              <p>
                <Distintivo stato={m.stato} /> · {formattaPrezzo(m.prezzo_cent)} · aggiornato {data(m.aggiornato_il)}
              </p>
              <p className="campo__aiuto">Controlla che foto e testo non coprano le informazioni obbligatorie e restino dentro la linea rossa.</p>
              {m.stato === "pubblicato" ? (
                <p>
                  <a href={`/m/${m.codice}`} target="_blank" rel="noopener">
                    Apri la pagina del cliente
                  </a>
                </p>
              ) : null}
              {m.marchio_aziende && !m.marchio_aziende.approvata && m.stato !== "pubblicato" ? (
                <Avviso tipo="attenzione">L&apos;azienda non è ancora approvata: approvala nella scheda Aziende prima di pubblicare.</Avviso>
              ) : null}
              {m.modifiche_in_attesa ? (
                <div className="avviso">
                  <strong>L&apos;azienda propone queste modifiche</strong> (online resta la versione qui a sinistra):
                  <div style={{ margin: ".75rem 0" }}>
                    <AnteprimaModello
                      immagine={(m.modifiche_in_attesa.immagine_url as string | null) ?? null}
                      modello={{
                        larghezza_mm: m.modifiche_in_attesa.larghezza_mm ?? m.larghezza_mm,
                        altezza_mm: m.modifiche_in_attesa.altezza_mm ?? m.altezza_mm,
                        zona_foto: m.modifiche_in_attesa.zona_foto ?? null,
                        zona_dedica: m.modifiche_in_attesa.consenti_dedica ? (m.modifiche_in_attesa.zona_dedica ?? null) : null,
                        zona_data: m.modifiche_in_attesa.consenti_data ? (m.modifiche_in_attesa.zona_data ?? null) : null,
                        font: m.modifiche_in_attesa.font ?? m.font,
                        colore_testo: m.modifiche_in_attesa.colore_testo ?? m.colore_testo,
                      }}
                      esempio={{ dedica: "Esempio di dedica", data: "25 dicembre 2026" }}
                    />
                  </div>
                  <div className="riga-pulsanti">
                    <Pulsante piccolo onClick={() => modifiche(m, true)}>
                      Approva le modifiche
                    </Pulsante>
                    <Pulsante piccolo variante="secondario" onClick={() => modifiche(m, false)}>
                      Scarta le modifiche
                    </Pulsante>
                  </div>
                </div>
              ) : null}
              <CampoEtichettato
                id={`nota-${m.id}`}
                etichetta="Nota per l'azienda (se va corretto)"
                value={note[m.id] ?? ""}
                onChange={(e) => setNote({ ...note, [m.id]: e.target.value })}
              />
              <div className="riga-pulsanti">
                {m.stato !== "pubblicato" ? (
                  <Pulsante piccolo onClick={() => cambia(m, "pubblicato")} disabled={!m.marchio_aziende?.approvata}>
                    Approva e pubblica
                  </Pulsante>
                ) : null}
                <Pulsante piccolo variante="secondario" onClick={() => cambia(m, "rifiutato")}>
                  {m.stato === "pubblicato" ? "Ritira dal sito" : "Rimanda da correggere"}
                </Pulsante>
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

/* ----------------------------- Aziende ----------------------------- */
function PannelloAziende() {
  const [aziende, setAziende] = useState<Azienda[] | null>(null);
  const carica = useCallback(async () => {
    const { data: r } = await supabase().from("marchio_aziende").select("*").order("creata_il", { ascending: false });
    setAziende((r as Azienda[]) ?? []);
  }, []);
  useEffect(() => {
    carica();
  }, [carica]);

  async function imposta(a: Azienda, approvata: boolean) {
    await supabase().from("marchio_aziende").update({ approvata }).eq("id", a.id);
    carica();
  }

  if (!aziende) return <p>Un momento…</p>;
  return (
    <section className="scheda">
      <h2>Aziende</h2>
      <div className="tabella-scorre">
        <table className="tabella">
          <thead>
            <tr>
              <th>Azienda</th>
              <th>Email</th>
              <th>Registrata</th>
              <th>Stato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {aziende.map((a) => (
              <tr key={a.id}>
                <td>{a.nome}</td>
                <td>{a.email ?? "—"}</td>
                <td>{data(a.creata_il)}</td>
                <td>
                  <Distintivo stato={a.approvata ? "si" : "no"} />
                </td>
                <td>
                  {a.approvata ? (
                    <PulsanteConferma testo="Revoca" conferma="Sì, revoca" onConferma={() => imposta(a, false)} />
                  ) : (
                    <Pulsante piccolo onClick={() => imposta(a, true)}>
                      Approva
                    </Pulsante>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ----------------------------- Ordini ----------------------------- */
interface Vendita {
  id: string;
  stato: string;
  da_controllare: boolean;
  dedica: string | null;
  data_testo: string | null;
  email: string | null;
  importo_cent: number;
  creata_il: string;
  pagata_il: string | null;
  marchio_modelli: { nome_prodotto: string; codice: string } | null;
}

function PannelloOrdini() {
  const [vendite, setVendite] = useState<Vendita[] | null>(null);
  const [soloDubbi, setSoloDubbi] = useState(false);
  const [immagini, setImmagini] = useState<Record<string, string>>({});

  const carica = useCallback(async () => {
    let q = supabase()
      .from("marchio_personalizzazioni")
      .select("id,stato,da_controllare,dedica,data_testo,email,importo_cent,creata_il,pagata_il,marchio_modelli(nome_prodotto,codice)")
      .neq("stato", "bozza")
      .order("creata_il", { ascending: false })
      .limit(200);
    if (soloDubbi) q = q.eq("da_controllare", true);
    const { data: r } = await q;
    setVendite((r as unknown as Vendita[]) ?? []);
  }, [soloDubbi]);
  useEffect(() => {
    carica();
  }, [carica]);

  async function vedi(id: string) {
    const { data: r } = await supabase().from("marchio_personalizzazioni").select("immagine").eq("id", id).single();
    if (r?.immagine) setImmagini((m) => ({ ...m, [id]: `data:image/jpeg;base64,${r.immagine}` }));
  }
  async function rimuovi(id: string) {
    await supabase().from("marchio_personalizzazioni").update({ stato: "rimossa", immagine: null, da_controllare: false }).eq("id", id);
    setImmagini((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
    carica();
  }
  async function vaBene(id: string) {
    await supabase().from("marchio_personalizzazioni").update({ da_controllare: false }).eq("id", id);
    carica();
  }

  if (!vendite) return <p>Un momento…</p>;
  const incasso = vendite.filter((v) => v.stato === "pagata" || v.stato === "scaricata").reduce((t, v) => t + v.importo_cent, 0);
  return (
    <section className="scheda">
      <h2>Etichette vendute</h2>
      <p>
        {vendite.length} etichette in elenco · incasso {formattaPrezzo(incasso)}. Foto e file si cancellano da soli dopo 30 giorni.
      </p>
      <Casella id="solo-dubbi" checked={soloDubbi} onChange={setSoloDubbi}>
        Mostra solo quelle da controllare
      </Casella>
      <div className="tabella-scorre">
        <table className="tabella">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Prodotto</th>
              <th>Testo</th>
              <th>Cliente</th>
              <th>Stato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vendite.map((v) => (
              <tr key={v.id}>
                <td>{data(v.pagata_il ?? v.creata_il)}</td>
                <td>{v.marchio_modelli?.nome_prodotto ?? "—"}</td>
                <td>
                  {v.dedica ?? ""} {v.data_testo ? <em>({v.data_testo})</em> : null}
                  {v.da_controllare ? (
                    <>
                      {" "}
                      <Distintivo stato="attesa" />
                    </>
                  ) : null}
                </td>
                <td>{v.email ?? "—"}</td>
                <td>
                  <Distintivo stato={v.stato} />
                </td>
                <td>
                  {immagini[v.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="miniatura" src={immagini[v.id]} alt="Etichetta del cliente" />
                  ) : v.stato !== "rimossa" ? (
                    <Pulsante piccolo variante="secondario" onClick={() => vedi(v.id)}>
                      Vedi
                    </Pulsante>
                  ) : null}
                  {v.stato !== "rimossa" ? (
                    <div className="riga-pulsanti" style={{ marginTop: ".5rem" }}>
                      {v.da_controllare ? (
                        <Pulsante piccolo onClick={() => vaBene(v.id)}>
                          Va bene
                        </Pulsante>
                      ) : null}
                      <PulsanteConferma testo="Rimuovi" conferma="Sì, rimuovi" onConferma={() => rimuovi(v.id)} />
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* -------------------------- Amministratori -------------------------- */
function PannelloAdmin({ mia: miaEmail }: { mia: string }) {
  const [lista, setLista] = useState<string[] | null>(null);
  const [nuova, setNuova] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const carica = useCallback(async () => {
    const { data: r } = await supabase().from("marchio_admin").select("email").order("aggiunto_il");
    setLista((r ?? []).map((x: { email: string }) => x.email));
  }, []);
  useEffect(() => {
    carica();
  }, [carica]);

  async function aggiungi(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValida(nuova)) return setErrore("Email non valida.");
    const { error } = await supabase().from("marchio_admin").insert({ email: nuova.trim().toLowerCase() });
    if (error) return setErrore("Non è stato possibile aggiungerla (forse c'è già).");
    setErrore(null);
    setNuova("");
    carica();
  }
  async function togli(email: string) {
    await supabase().from("marchio_admin").delete().eq("email", email);
    carica();
  }

  return (
    <section className="scheda">
      <h2>Amministratori</h2>
      <p>Chi è in questo elenco, dopo aver creato l&apos;accesso con la stessa email e averla confermata, entra in questa pagina.</p>
      <ul>
        {lista?.map((e) => (
          <li key={e} style={{ marginBottom: ".5rem" }}>
            {e}{" "}
            {e !== miaEmail.toLowerCase() ? <PulsanteConferma testo="Togli" conferma="Sì, togli" onConferma={() => togli(e)} /> : <em>(sei tu)</em>}
          </li>
        ))}
      </ul>
      <form onSubmit={aggiungi} className="riga-pulsanti" style={{ alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 260px" }}>
          <CampoEtichettato id="nuovo-admin" etichetta="Aggiungi un amministratore" type="email" value={nuova} onChange={(e) => setNuova(e.target.value)} errore={errore} />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <Pulsante type="submit">Aggiungi</Pulsante>
        </div>
      </form>
    </section>
  );
}

/* ------------------------------ Pagina ------------------------------ */
export function AreaAdmin() {
  const s = useSessione();
  const [scheda, setScheda] = useState<Scheda>("tema");

  if (!s.pronto) return <p>Un momento…</p>;
  if (!s.utente) {
    return (
      <>
        <h1>Amministrazione</h1>
        <PulsanteLink href="/accedi">Entra</PulsanteLink>
      </>
    );
  }
  if (!s.admin) {
    return (
      <>
        <h1>Amministrazione</h1>
        <Avviso tipo="attenzione">Questo accesso non è da amministratore.</Avviso>
        <Pulsante variante="secondario" onClick={esci}>
          Esci
        </Pulsante>
      </>
    );
  }

  return (
    <>
      <div className="riga-pulsanti" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Amministrazione</h1>
        <Pulsante variante="secondario" piccolo onClick={esci}>
          Esci
        </Pulsante>
      </div>
      <div className="schede-tab" role="tablist" style={{ marginTop: "1.5rem" }}>
        {(Object.keys(SCHEDE) as Scheda[]).map((k) => (
          <Pulsante key={k} piccolo variante="secondario" role="tab" aria-selected={scheda === k} onClick={() => setScheda(k)}>
            {SCHEDE[k]}
          </Pulsante>
        ))}
      </div>
      {scheda === "tema" ? <PannelloTema /> : null}
      {scheda === "modelli" ? <PannelloModelli /> : null}
      {scheda === "aziende" ? <PannelloAziende /> : null}
      {scheda === "ordini" ? <PannelloOrdini /> : null}
      {scheda === "admin" ? <PannelloAdmin mia={s.utente.email ?? ""} /> : null}
    </>
  );
}
