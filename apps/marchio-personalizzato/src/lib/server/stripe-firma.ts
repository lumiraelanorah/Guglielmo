import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifica l'intestazione Stripe-Signature (t=...,v1=...) sul corpo grezzo. */
export function firmaStripeValida(corpo: string, intestazione: string | null, segreto: string, adesso = Date.now(), tolleranzaSec = 300): boolean {
  if (!intestazione || !segreto) return false;
  const parti = intestazione.split(",").map((p) => p.trim().split("="));
  const t = parti.find(([k]) => k === "t")?.[1];
  const firme = parti.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || firme.length === 0) return false;
  if (Math.abs(adesso / 1000 - Number(t)) > tolleranzaSec) return false;
  const attesa = createHmac("sha256", segreto).update(`${t}.${corpo}`).digest("hex");
  return firme.some((f) => f.length === attesa.length && timingSafeEqual(Buffer.from(f), Buffer.from(attesa)));
}
