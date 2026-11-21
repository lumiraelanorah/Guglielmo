"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pulsante } from "@/components/atoms/Pulsante";
import { Avviso } from "@/components/atoms/Avviso";
import { CampoEtichettato } from "@/components/molecules/CampoEtichettato";
import { supabase } from "@/lib/supabase/browser";
import { emailValida } from "@/lib/validazione";

type Modalita = "entra" | "registrati" | "dimenticata" | "nuova";

function traduci(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email o password non corrette.";
  if (m.includes("email not confirmed")) return "Devi prima confermare l'email: apri il link che ti abbiamo mandato.";
  if (m.includes("already registered")) return "Questa email è già registrata: usa \"Entra\".";
  if (m.includes("rate limit")) return "Troppi tentativi. Aspetta qualche minuto e riprova.";
  if (m.includes("password")) return "La password deve avere almeno 8 caratteri.";
  return "Qualcosa non ha funzionato. Riprova.";
}

export function ModuloAccesso() {
  const router = useRouter();
  const [modalita, setModalita] = useState<Modalita>("entra");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase().auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") setModalita("nuova");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function dopoAccesso() {
    const { data: admin } = await supabase().rpc("marchio_is_admin");
    router.push(admin ? "/admin" : "/azienda");
  }

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setMessaggio(null);
    if (modalita !== "nuova" && !emailValida(email)) return setErrore("Scrivi un indirizzo email valido.");
    if ((modalita === "registrati" || modalita === "nuova") && password.length < 8)
      return setErrore("La password deve avere almeno 8 caratteri.");
    if (modalita === "registrati" && nome.trim().length < 2) return setErrore("Scrivi il nome dell'azienda.");
    setAttesa(true);
    const sb = supabase();
    try {
      if (modalita === "entra") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await dopoAccesso();
      } else if (modalita === "registrati") {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { nome_azienda: nome.trim() }, emailRedirectTo: `${window.location.origin}/accedi` },
        });
        if (error) throw error;
        if (data.session) {
          await sb.rpc("marchio_registra_azienda", { p_nome: nome.trim() });
          await dopoAccesso();
        } else {
          setMessaggio("Ti abbiamo mandato un'email: apri il link per confermare l'indirizzo, poi torna qui e premi \"Entra\".");
          setModalita("entra");
        }
      } else if (modalita === "dimenticata") {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/accedi` });
        if (error) throw error;
        setMessaggio("Se l'email è registrata, ti abbiamo mandato un link per scegliere una nuova password.");
      } else {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        setMessaggio("Password aggiornata.");
        await dopoAccesso();
      }
    } catch (err) {
      setErrore(traduci(err instanceof Error ? err.message : String(err)));
    } finally {
      setAttesa(false);
    }
  }

  const titoli: Record<Modalita, string> = {
    entra: "Entra nell'area riservata",
    registrati: "Registra la tua azienda",
    dimenticata: "Recupera la password",
    nuova: "Scegli una nuova password",
  };

  return (
    <div className="scheda">
      {modalita === "entra" || modalita === "registrati" ? (
        <div className="schede-tab" role="tablist">
          <Pulsante piccolo variante="secondario" role="tab" aria-selected={modalita === "entra"} onClick={() => setModalita("entra")}>
            Entra
          </Pulsante>
          <Pulsante piccolo variante="secondario" role="tab" aria-selected={modalita === "registrati"} onClick={() => setModalita("registrati")}>
            Registrati
          </Pulsante>
        </div>
      ) : null}
      <h2>{titoli[modalita]}</h2>
      {messaggio ? <Avviso tipo="ok">{messaggio}</Avviso> : null}
      {errore ? <Avviso tipo="errore">{errore}</Avviso> : null}
      <form onSubmit={invia} noValidate>
        {modalita === "registrati" ? (
          <CampoEtichettato id="nome" etichetta="Nome dell'azienda" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="organization" />
        ) : null}
        {modalita !== "nuova" ? (
          <CampoEtichettato id="email" etichetta="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
        ) : null}
        {modalita !== "dimenticata" ? (
          <CampoEtichettato
            id="password"
            etichetta={modalita === "nuova" ? "Nuova password" : "Password"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={modalita === "entra" ? "current-password" : "new-password"}
            aiuto={modalita === "entra" ? undefined : "Almeno 8 caratteri."}
          />
        ) : null}
        <Pulsante type="submit" largo disabled={attesa}>
          {attesa ? "Un momento…" : modalita === "entra" ? "Entra" : modalita === "registrati" ? "Crea l'accesso" : modalita === "dimenticata" ? "Mandami il link" : "Salva la password"}
        </Pulsante>
      </form>
      {modalita === "entra" ? (
        <p style={{ marginTop: "1rem" }}>
          <button type="button" className="pulsante pulsante--secondario pulsante--piccolo" onClick={() => setModalita("dimenticata")}>
            Ho dimenticato la password
          </button>
        </p>
      ) : modalita === "dimenticata" ? (
        <p style={{ marginTop: "1rem" }}>
          <button type="button" className="pulsante pulsante--secondario pulsante--piccolo" onClick={() => setModalita("entra")}>
            Torna a &quot;Entra&quot;
          </button>
        </p>
      ) : null}
    </div>
  );
}
