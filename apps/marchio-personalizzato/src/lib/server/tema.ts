import { leggi } from "./db";
import { CALENDARIO_PREDEFINITO, eNomeTema, temaAttivo, type NomeTema, type VoceCalendario } from "../temi";

interface Impostazioni {
  tema_manuale: string | null;
  calendario: VoceCalendario[];
}

/** Tema del sito oggi (ora italiana). Se i dati non rispondono, usa il calendario predefinito. */
export async function temaDiOggi(): Promise<NomeTema> {
  const oggi = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  try {
    const righe = await leggi<Impostazioni[]>("marchio_impostazioni?select=tema_manuale,calendario&id=eq.1", 30);
    const imp = righe[0];
    return temaAttivo(oggi, imp?.calendario ?? CALENDARIO_PREDEFINITO, eNomeTema(imp?.tema_manuale) ? imp.tema_manuale : null);
  } catch {
    return temaAttivo(oggi, CALENDARIO_PREDEFINITO, null);
  }
}
