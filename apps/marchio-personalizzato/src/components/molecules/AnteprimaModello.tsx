"use client";

import { useEffect, useRef, useState } from "react";
import { disegnaEtichetta, type ModelloDisegno } from "@/lib/disegno";
import { STAMPA } from "@/lib/stampa-misure";
import { POSIZIONE_INIZIALE } from "@/lib/zone";

const cache = new Map<string, Promise<HTMLImageElement>>();

export function caricaImmagine(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src);
  if (!p) {
    p = new Promise((ok, ko) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => ok(img);
      img.onerror = ko;
      img.src = src;
    });
    cache.set(src, p);
  }
  return p;
}

/** Il modello con le zone modificabili evidenziate (solo lettura). */
export function AnteprimaModello({
  immagine,
  modello,
  esempio,
  larghezza,
}: {
  immagine: string | null;
  modello: ModelloDisegno;
  esempio?: { dedica: string; data: string };
  larghezza?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (immagine) caricaImmagine(immagine).then(setImg).catch(() => setImg(null));
    else setImg(null);
  }, [immagine]);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    disegnaEtichetta(
      ctx,
      img,
      modello,
      { foto: null, posizione: POSIZIONE_INIZIALE, dedica: esempio?.dedica ?? "", data: esempio?.data ?? "" },
      { mostraZone: true, mostraTaglio: true }
    );
  }, [img, modello, esempio]);

  return (
    <div className="tela" style={larghezza ? { width: larghezza } : undefined}>
      <canvas ref={ref} width={STAMPA.larghezzaPx} height={STAMPA.altezzaPx} role="img" aria-label="Anteprima del modello con le zone modificabili" />
    </div>
  );
}
