"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./browser";
import type { Azienda } from "../tipi";

export interface StatoSessione {
  pronto: boolean;
  utente: User | null;
  admin: boolean;
  azienda: Azienda | null;
  ricarica: () => void;
}

/** Utente collegato, se è amministratore e la sua azienda (creata al primo accesso). */
export function useSessione(): StatoSessione {
  const [stato, setStato] = useState<Omit<StatoSessione, "ricarica">>({ pronto: false, utente: null, admin: false, azienda: null });
  const [giro, setGiro] = useState(0);

  useEffect(() => {
    let vivo = true;
    const sb = supabase();
    async function carica() {
      const { data } = await sb.auth.getSession();
      const utente = data.session?.user ?? null;
      if (!utente) {
        if (vivo) setStato({ pronto: true, utente: null, admin: false, azienda: null });
        return;
      }
      const [{ data: admin }, { data: aziende }] = await Promise.all([
        sb.rpc("marchio_is_admin"),
        sb.from("marchio_aziende").select("*").eq("user_id", utente.id).limit(1),
      ]);
      let azienda = (aziende?.[0] as Azienda | undefined) ?? null;
      const nome = (utente.user_metadata?.nome_azienda as string | undefined)?.trim();
      if (!azienda && !admin && utente.email_confirmed_at && nome && nome.length >= 2) {
        const { data: nuova } = await sb.rpc("marchio_registra_azienda", { p_nome: nome });
        azienda = (nuova as Azienda | null) ?? null;
      }
      if (vivo) setStato({ pronto: true, utente, admin: Boolean(admin), azienda });
    }
    carica();
    const { data: sub } = sb.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT") carica();
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [giro]);

  return { ...stato, ricarica: () => setGiro((g) => g + 1) };
}

export async function esci() {
  await supabase().auth.signOut();
  window.location.assign("/");
}
