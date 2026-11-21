import type { ReactNode } from "react";

export function Avviso({ tipo = "info", children }: { tipo?: "info" | "errore" | "ok" | "attenzione"; children: ReactNode }) {
  return (
    <div className={`avviso${tipo !== "info" ? ` avviso--${tipo}` : ""}`} role={tipo === "errore" ? "alert" : "status"}>
      {children}
    </div>
  );
}
