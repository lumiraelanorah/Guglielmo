import { rpc, segretoServer } from "./db";
import { inviaRicevuta } from "./email";
import { linkGrazie } from "../link";

export interface DatiEtichetta {
  stato: "bozza" | "pagata" | "scaricata" | "rimossa";
  immagine: string | null;
  email: string | null;
  importo_cent: number;
  nome_prodotto: string;
  codice: string;
  nome_azienda: string;
  pagata_il: string | null;
}

export async function leggiEtichetta(id: string, token: string, conImmagine: boolean): Promise<DatiEtichetta | null> {
  const righe = await rpc<DatiEtichetta[]>("marchio_leggi_personalizzazione", {
    p_segreto: segretoServer(),
    p_id: id,
    p_token: token,
    p_con_immagine: conImmagine,
  });
  return righe[0] ?? null;
}

/** Registra il pagamento (una sola volta) e manda la ricevuta. */
export async function registraPagamento(
  id: string,
  token: string,
  metodo: "prova" | "stripe",
  riferimento: string,
  origine: string
): Promise<void> {
  const esito = await rpc<string>("marchio_segna_pagata", {
    p_segreto: segretoServer(),
    p_id: id,
    p_token: token,
    p_metodo: metodo,
    p_riferimento: riferimento,
  });
  if (esito === "nuova") {
    const e = await leggiEtichetta(id, token, false);
    if (e?.email) {
      await inviaRicevuta(e.email, {
        prodotto: e.nome_prodotto,
        marchio: e.nome_azienda,
        importoCent: e.importo_cent,
        link: linkGrazie(origine, id, token),
      });
    }
  }
}
