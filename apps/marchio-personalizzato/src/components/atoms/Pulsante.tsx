import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primario" | "secondario" | "pericolo";

function classi(variante: Variante, piccolo?: boolean, largo?: boolean, extra?: string) {
  return [
    "pulsante",
    variante !== "primario" ? `pulsante--${variante}` : "",
    piccolo ? "pulsante--piccolo" : "",
    largo ? "pulsante--largo" : "",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export interface PulsanteProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  piccolo?: boolean;
  largo?: boolean;
}

export function Pulsante({ variante = "primario", piccolo, largo, className, type = "button", ...resto }: PulsanteProps) {
  return <button type={type} className={classi(variante, piccolo, largo, className)} {...resto} />;
}

export function PulsanteLink(props: {
  href: string;
  children: ReactNode;
  variante?: Variante;
  piccolo?: boolean;
  largo?: boolean;
  esterno?: boolean;
  download?: boolean;
}) {
  const c = classi(props.variante ?? "primario", props.piccolo, props.largo);
  if (props.esterno || props.download) {
    return (
      <a href={props.href} className={c} download={props.download || undefined}>
        {props.children}
      </a>
    );
  }
  return (
    <Link href={props.href} className={c}>
      {props.children}
    </Link>
  );
}
