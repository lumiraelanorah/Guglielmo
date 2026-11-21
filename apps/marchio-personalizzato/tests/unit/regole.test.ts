import { test } from "node:test";
import assert from "node:assert/strict";
import { controllaTesto, analizzaParoleVietate } from "../../src/lib/testo";
import { contenutoValido } from "../../src/lib/regole";
import { creaBollinoSvg } from "../../src/lib/bollino";

test("parole vietate della casa produttrice", () => {
  const extra = ["Concorrente Spa", "birrone"];
  assert.equal(controllaTesto("Meglio di Concorrente SpA!", 60, extra).ok, false);
  assert.equal(controllaTesto("che BIRR0NE", 60, extra).ok, false);
  assert.match(controllaTesto("che birrone", 60, extra).errore!, /non è consentit/);
  assert.equal(controllaTesto("Buon compleanno", 60, extra).ok, true);
});

test("elenco parole vietate dal campo di testo", () => {
  assert.deepEqual(analizzaParoleVietate(" pippo, Pluto ,,\nPAPERINO; pippo "), ["pippo", "pluto", "paperino"]);
  assert.equal(analizzaParoleVietate("x".repeat(40)).length, 0);
  assert.equal(analizzaParoleVietate(Array.from({ length: 150 }, (_, i) => `p${i}`).join(",")).length, 100);
});

test("foto oppure messaggio", () => {
  const tutto = { consentiFoto: true, consentiDedica: true };
  assert.equal(contenutoValido({ ...tutto, haFoto: true, dedica: "" }).ok, true);
  assert.equal(contenutoValido({ ...tutto, haFoto: false, dedica: "Auguri" }).ok, true);
  assert.equal(contenutoValido({ ...tutto, haFoto: false, dedica: "  " }).ok, false);
  assert.equal(contenutoValido({ consentiFoto: false, consentiDedica: true, haFoto: true, dedica: "x" }).ok, false);
  assert.equal(contenutoValido({ consentiFoto: true, consentiDedica: false, haFoto: false, dedica: "" }).ok, false);
});

test("bollino da stampare sulla confezione", () => {
  const svg = creaBollinoSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"><path d="M0 0h7v7H0z"/></svg>', {
    marchio: "A & B",
    prodotto: "Birra <rossa>",
  });
  assert.match(svg, /^<svg/);
  assert.match(svg, /A &amp; B/);
  assert.match(svg, /Birra &lt;rossa&gt;/);
  assert.match(svg, /M0 0h7v7H0z/);
  assert.match(svg, /Inquadra/);
  assert.match(svg, /width="50mm"/);
});
