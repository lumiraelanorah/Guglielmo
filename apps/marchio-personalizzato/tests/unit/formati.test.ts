import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { misure, FORMATI, formatoValido } from "../../src/lib/stampa-misure";
import { creaPdfStampa } from "../../src/lib/server/pdf";

const JPEG = Buffer.from(
  "/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpAB//Z",
  "base64"
);
const mm = (v: number) => (v / 25.4) * 72;

test("misure: orizzontale predefinito e verticale 80x100", () => {
  assert.deepEqual(misure(), { larghezzaPx: 1252, altezzaPx: 898, abbondanzaPx: 35, larghezzaMm: 100, altezzaMm: 70 });
  const v = misure(80, 100);
  assert.equal(v.larghezzaPx, 1016);
  assert.equal(v.altezzaPx, 1252);
});

test("formati ammessi", () => {
  assert.ok(FORMATI.length >= 3);
  assert.equal(formatoValido(80, 100), true);
  assert.equal(formatoValido(33, 100), false);
});

test("pdf nel formato del modello", async () => {
  const doc = await PDFDocument.load(await creaPdfStampa(JPEG, { titolo: "W", marchio: "M" }, { larghezzaMm: 80, altezzaMm: 100 }));
  const trim = doc.getPage(0).getTrimBox();
  assert.ok(Math.abs(trim.width - mm(80)) < 0.01);
  assert.ok(Math.abs(trim.height - mm(100)) < 0.01);
});
