"use client";

import { useEffect, useRef, useState } from "react";
import { disegnaEtichetta, type ModelloDisegno } from "@/lib/disegno";
import { misure } from "@/lib/stampa-misure";
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

  const dim = misure(modello.larghezza_mm, modello.altezza_mm);
  const verticale = dim.larghezzaPx <= dim.altezzaPx;
  return (
    <div
      className={`tela${verticale ? " tela--verticale" : ""}`}
      style={{ aspectRatio: `${dim.larghezzaPx} / ${dim.altezzaPx}`, ...(larghezza ? { width: larghezza } : {}) }}
    >
      <canvas ref={ref} width={dim.larghezzaPx} height={dim.altezzaPx} role="img" aria-label="Anteprima del modello con le zone modificabili" />
    </div>
  );
}
