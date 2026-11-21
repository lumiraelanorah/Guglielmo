export interface Contenuto {
  consentiFoto: boolean;
  consentiDedica: boolean;
  haFoto: boolean;
  dedica: string;
}

/** Il cliente deve mettere almeno una foto o un messaggio, e solo ciò che il marchio permette. */
export function contenutoValido(c: Contenuto): { ok: boolean; errore?: string } {
  if (c.haFoto && !c.consentiFoto) return { ok: false, errore: "Su questa etichetta non si possono mettere foto." };
  const haMessaggio = c.dedica.trim().length > 0;
  if (haMessaggio && !c.consentiDedica) return { ok: false, errore: "Su questa etichetta non si possono scrivere messaggi." };
  if (!c.haFoto && !haMessaggio) {
    return {
      ok: false,
      errore: c.consentiFoto && c.consentiDedica ? "Metti una foto oppure scrivi un messaggio." : c.consentiFoto ? "Scegli una foto." : "Scrivi un messaggio.",
    };
  }
  return { ok: true };
}
