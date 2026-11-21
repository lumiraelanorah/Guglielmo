import type { Zona } from "./zone";
import type { FontModello } from "./disegno";

export type StatoModello = "bozza" | "in_revisione" | "pubblicato" | "rifiutato";

export interface ModelloPubblico {
  id: string;
  codice: string;
  nome_prodotto: string;
  nome_azienda: string;
  immagine_url: string | null;
  zona_foto: Zona | null;
  zona_dedica: Zona | null;
  zona_data: Zona | null;
  consenti_dedica: boolean;
  consenti_data: boolean;
  max_caratteri: number;
  font: FontModello;
  colore_testo: string;
  prezzo_cent: number;
}

export interface Modello extends Omit<ModelloPubblico, "nome_azienda"> {
  azienda_id: string;
  stato: StatoModello;
  nota_admin: string | null;
  creato_il: string;
  aggiornato_il: string;
}

export interface Azienda {
  id: string;
  user_id: string | null;
  nome: string;
  email: string | null;
  approvata: boolean;
  creata_il: string;
}
