import { test } from "node:test";
import assert from "node:assert/strict";
import { temaAttivo, TEMI, calendarioValido, CALENDARIO_PREDEFINITO } from "../../src/lib/temi";
import { controllaTesto, formattaData, normalizza } from "../../src/lib/testo";
import { posizioneFoto, zonaInPixel, zonaValida, normalizzaRettangolo, limitaSpostamento } from "../../src/lib/zone";
import { formattaPrezzo } from "../../src/lib/prezzo";
import { emailValida, jpegBase64Valido, daDataUrl } from "../../src/lib/validazione";
import { adattaTesto } from "../../src/lib/disegno";
import { STAMPA } from "../../src/lib/stampa-misure";

test("temi: calendario predefinito", () => {
  assert.equal(temaAttivo(new Date("2026-11-21T12:00:00"), CALENDARIO_PREDEFINITO, null), "natale");
  assert.equal(temaAttivo(new Date("2026-12-31T12:00:00"), CALENDARIO_PREDEFINITO, null), "natale");
  assert.equal(temaAttivo(new Date("2027-01-10T12:00:00"), CALENDARIO_PREDEFINITO, null), "sanvalentino");
  assert.equal(temaAttivo(new Date("2027-03-01T12:00:00"), CALENDARIO_PREDEFINITO, null), "pasqua");
  assert.equal(temaAttivo(new Date("2027-07-15T12:00:00"), CALENDARIO_PREDEFINITO, null), "regalo");
  assert.equal(temaAttivo(new Date("2027-10-31T12:00:00"), CALENDARIO_PREDEFINITO, null), "regalo");
});

test("temi: la scelta manuale vince sul calendario", () => {
  assert.equal(temaAttivo(new Date("2026-11-21"), CALENDARIO_PREDEFINITO, "pasqua"), "pasqua");
});

test("temi: calendario non ordinato o vuoto", () => {
  const cal = [
    { tema: "regalo", dal: "07-01" },
    { tema: "natale", dal: "12-01" },
  ] as const;
  assert.equal(temaAttivo(new Date("2027-02-01T12:00:00"), [...cal], null), "natale");
  assert.equal(temaAttivo(new Date("2027-08-01T12:00:00"), [...cal], null), "regalo");
  assert.equal(temaAttivo(new Date("2027-08-01"), [], null), "regalo");
  assert.ok(TEMI.natale.nome.length > 0);
});

test("temi: validazione calendario", () => {
  assert.equal(calendarioValido(CALENDARIO_PREDEFINITO), true);
  assert.equal(calendarioValido([{ tema: "natale", dal: "13-01" }]), false);
  assert.equal(calendarioValido([{ tema: "boh", dal: "01-01" }]), false);
  assert.equal(calendarioValido("x"), false);
});

test("testo: lunghezza massima", () => {
  assert.equal(controllaTesto("Buon Natale nonna!", 60).ok, true);
  const lungo = controllaTesto("a".repeat(61), 60);
  assert.equal(lungo.ok, false);
  assert.match(lungo.errore!, /60/);
});

test("testo: parole offensive bloccate anche camuffate", () => {
  assert.equal(controllaTesto("sei uno stronzo", 60).ok, false);
  assert.equal(controllaTesto("sei uno str0nz0", 60).ok, false);
  assert.equal(controllaTesto("V A F F A N C U L O", 60).ok, false);
  assert.equal(controllaTesto("Auguri di cuore", 60).ok, true);
});

test("testo: casi dubbi vanno segnalati ma accettati", () => {
  const r = controllaTesto("che figata di regalo", 60);
  assert.equal(r.ok, true);
  assert.equal(r.daControllare, true);
  assert.equal(controllaTesto("Ti voglio bene", 60).daControllare, false);
});

test("testo: no falsi positivi su parole normali", () => {
  for (const t of ["Analisi", "Cassetta", "Fico d'India", "Scappare", "Coglierai i frutti", "Pompei"]) {
    assert.equal(controllaTesto(t, 60).ok, true, t);
  }
});

test("testo: normalizza", () => {
  assert.equal(normalizza("Perché 1L"), "perche il");
});

test("data: formato italiano", () => {
  assert.equal(formattaData("2026-12-25"), "25 dicembre 2026");
  assert.equal(formattaData("2027-02-14"), "14 febbraio 2027");
  assert.equal(formattaData(""), "");
  assert.equal(formattaData("ciao"), "");
});

test("zone: validità e conversione in pixel", () => {
  assert.equal(zonaValida({ x: 0.1, y: 0.1, w: 0.3, h: 0.3 }), true);
  assert.equal(zonaValida({ x: 0.9, y: 0.1, w: 0.3, h: 0.3 }), false);
  assert.equal(zonaValida({ x: 0.1, y: 0.1, w: 0.01, h: 0.3 }), false);
  assert.equal(zonaValida(null), false);
  assert.deepEqual(zonaInPixel({ x: 0.5, y: 0.25, w: 0.25, h: 0.5 }, 1000, 800), { x: 500, y: 200, w: 250, h: 400 });
});

test("zone: rettangolo disegnato al contrario viene normalizzato e limitato", () => {
  const r = normalizzaRettangolo({ x: 0.8, y: 0.9 }, { x: 0.2, y: 1.2 });
  assert.deepEqual(r, { x: 0.2, y: 0.9, w: 0.6000000000000001, h: 0.09999999999999998 });
});

test("foto: copre sempre la zona (cover) e resta centrata", () => {
  const zona = { x: 100, y: 100, w: 400, h: 400 };
  const p = posizioneFoto(zona, { w: 800, h: 400 }, { zoom: 1, px: 0, py: 0 });
  assert.equal(p.h, 400);
  assert.equal(p.w, 800);
  assert.equal(p.x, 100 - 200);
  assert.equal(p.y, 100);
});

test("foto: spostamento al massimo arriva al bordo, mai oltre", () => {
  const zona = { x: 0, y: 0, w: 400, h: 400 };
  const p = posizioneFoto(zona, { w: 800, h: 400 }, { zoom: 1, px: 1, py: 0 });
  assert.equal(p.x, 0);
  const q = posizioneFoto(zona, { w: 800, h: 400 }, { zoom: 1, px: -1, py: 0 });
  assert.equal(q.x + q.w, 400);
});

test("foto: zoom ingrandisce", () => {
  const zona = { x: 0, y: 0, w: 400, h: 400 };
  const p = posizioneFoto(zona, { w: 400, h: 400 }, { zoom: 2, px: 0, py: 0 });
  assert.equal(p.w, 800);
  assert.equal(p.x, -200);
});

test("foto: trascinare converte pixel in frazione e limita", () => {
  const zona = { x: 0, y: 0, w: 400, h: 400 };
  const s = limitaSpostamento(zona, { w: 800, h: 400 }, { zoom: 1, px: 0, py: 0 }, 100, 50);
  assert.equal(s.px, 0.5);
  assert.equal(s.py, 0);
  const t = limitaSpostamento(zona, { w: 800, h: 400 }, { zoom: 1, px: 0.9, py: 0 }, 1000, 0);
  assert.equal(t.px, 1);
});

test("prezzo", () => {
  assert.equal(formattaPrezzo(299), "2,99 €");
  assert.equal(formattaPrezzo(1000), "10,00 €");
});

test("validazione email e immagine", () => {
  assert.equal(emailValida("mario.rossi@example.it"), true);
  assert.equal(emailValida("mario@"), false);
  assert.equal(emailValida(""), false);
  assert.equal(jpegBase64Valido("/9j/4AAQSkZJRg=="), true);
  assert.equal(jpegBase64Valido("iVBORw0KGgo="), false);
  assert.equal(daDataUrl("data:image/jpeg;base64,/9j/abc"), "/9j/abc");
  assert.equal(daDataUrl("/9j/abc"), "/9j/abc");
});

test("testo nel riquadro: va a capo e rimpicciolisce finché entra", () => {
  const misura = (t: string, size: number) => t.length * size * 0.5;
  const r = adattaTesto("Buon Natale alla nonna più dolce del mondo", 300, 120, misura, 60, 14);
  assert.ok(r.dimensione <= 60 && r.dimensione >= 14);
  for (const riga of r.righe) assert.ok(misura(riga, r.dimensione) <= 300, riga);
  assert.ok(r.righe.length * r.dimensione * 1.2 <= 120 + 0.001);
  assert.equal(r.righe.join(" "), "Buon Natale alla nonna più dolce del mondo");
});

test("testo nel riquadro: testo vuoto", () => {
  const r = adattaTesto("   ", 300, 120, (t, s) => t.length * s, 60, 14);
  assert.deepEqual(r.righe, []);
});

test("misure di stampa: 100x70 mm con abbondanza 3 mm a 300 dpi", () => {
  assert.equal(STAMPA.larghezzaPx, 1252);
  assert.equal(STAMPA.altezzaPx, 898);
  assert.equal(STAMPA.abbondanzaPx, 35);
});
