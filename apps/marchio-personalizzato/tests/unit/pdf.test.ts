import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { creaPdfStampa, MARGINE_SEGNI_MM } from "../../src/lib/server/pdf";

// JPEG 2x2 valido
const JPEG_1PX = Buffer.from(
  "/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpAB//Z",
  "base64"
);

const mm = (v: number) => (v / 25.4) * 72;

test("pdf: una pagina con etichetta, abbondanza e segni di taglio", async () => {
  const bytes = await creaPdfStampa(JPEG_1PX, { titolo: "Panettone della Casa", marchio: "Marchio Prova" });
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 1);
  const { width, height } = doc.getPage(0).getSize();
  assert.ok(Math.abs(width - mm(106 + 2 * MARGINE_SEGNI_MM)) < 0.01, `larghezza ${width}`);
  assert.ok(Math.abs(height - mm(76 + 2 * MARGINE_SEGNI_MM)) < 0.01, `altezza ${height}`);
  const page = doc.getPage(0);
  const trim = page.getTrimBox();
  assert.ok(Math.abs(trim.width - mm(100)) < 0.01);
  assert.ok(Math.abs(trim.height - mm(70)) < 0.01);
  const bleed = page.getBleedBox();
  assert.ok(Math.abs(bleed.width - mm(106)) < 0.01);
  assert.equal(doc.getTitle(), "Etichetta – Panettone della Casa");
});
