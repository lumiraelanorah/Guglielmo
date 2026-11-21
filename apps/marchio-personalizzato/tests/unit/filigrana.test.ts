import { test } from "node:test";
import assert from "node:assert/strict";
import { disegnaEtichetta, type ModelloDisegno } from "../../src/lib/disegno";
import { zonaValida } from "../../src/lib/zone";
import { POSIZIONE_INIZIALE } from "../../src/lib/zone";

function ctxFinto() {
  const chiamate: string[] = [];
  const testi: string[] = [];
  const proxy: Record<string, unknown> = {};
  const ctx = new Proxy(proxy, {
    get(_t, k: string) {
      if (k === "measureText") return (t: string) => ({ width: t.length * 10 });
      if (k === "fillText") return (t: string) => testi.push(t);
      if (k in proxy) return proxy[k];
      return (..._a: unknown[]) => chiamate.push(k);
    },
    set(_t, k: string, v) {
      proxy[k] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, chiamate, testi };
}

const modello: ModelloDisegno = {
  zona_foto: { x: 0.3, y: 0.2, w: 0.4, h: 0.5, forma: "ovale" },
  zona_dedica: null,
  zona_data: null,
  font: "serif",
  colore_testo: "#000000",
};
const foto = { width: 100, height: 100 } as unknown as CanvasImageSource & { width: number; height: number };

test("anteprima con filigrana prima dell'acquisto", () => {
  const { ctx, testi } = ctxFinto();
  disegnaEtichetta(ctx, null, modello, { foto, posizione: POSIZIONE_INIZIALE, dedica: "", data: "" }, { filigrana: true });
  assert.ok(testi.some((t) => t.includes("ANTEPRIMA")));
});

test("file finale senza filigrana", () => {
  const { ctx, testi } = ctxFinto();
  disegnaEtichetta(ctx, null, modello, { foto, posizione: POSIZIONE_INIZIALE, dedica: "", data: "" }, {});
  assert.ok(!testi.some((t) => t.includes("ANTEPRIMA")));
});

test("la foto ovale viene ritagliata con un'ellisse", () => {
  const { ctx, chiamate } = ctxFinto();
  disegnaEtichetta(ctx, null, modello, { foto, posizione: POSIZIONE_INIZIALE, dedica: "", data: "" }, {});
  assert.ok(chiamate.includes("ellipse"));
  assert.ok(!chiamate.includes("rect"));
});

test("zona con forma valida o no", () => {
  assert.equal(zonaValida({ x: 0.1, y: 0.1, w: 0.3, h: 0.3, forma: "ovale" }), true);
  assert.equal(zonaValida({ x: 0.1, y: 0.1, w: 0.3, h: 0.3, forma: "stella" }), false);
});
