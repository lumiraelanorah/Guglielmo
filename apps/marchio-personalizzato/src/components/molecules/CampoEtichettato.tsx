import type { InputHTMLAttributes, ReactNode } from "react";

export interface CampoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  etichetta: string;
  aiuto?: ReactNode;
  errore?: string | null;
  contatore?: { attuale: number; massimo: number };
}

export function CampoEtichettato({ id, etichetta, aiuto, errore, contatore, ...input }: CampoProps) {
  const descr = [aiuto ? `${id}-aiuto` : "", errore ? `${id}-errore` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="campo">
      <label className="campo__etichetta" htmlFor={id}>
        {etichetta}
      </label>
      {aiuto ? (
        <span id={`${id}-aiuto`} className="campo__aiuto">
          {aiuto}
        </span>
      ) : null}
      <input id={id} className="campo__input" aria-invalid={errore ? true : undefined} aria-describedby={descr} {...input} />
      {contatore ? (
        <span className="campo__contatore" aria-live="polite">
          {contatore.attuale}/{contatore.massimo}
        </span>
      ) : null}
      {errore ? (
        <span id={`${id}-errore`} className="campo__errore">
          {errore}
        </span>
      ) : null}
    </div>
  );
}
