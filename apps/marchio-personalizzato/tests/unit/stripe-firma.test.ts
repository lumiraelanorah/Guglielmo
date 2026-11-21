import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { firmaStripeValida } from "../../src/lib/server/stripe-firma";
import { parametriCheckout } from "../../src/lib/server/stripe";

const segreto = "whsec_prova";
const corpo = '{"type":"checkout.session.completed"}';
const ora = 1_800_000_000_000;
const t = String(ora / 1000);
const firma = createHmac("sha256", segreto).update(`${t}.${corpo}`).digest("hex");

test("firma stripe valida", () => {
  assert.equal(firmaStripeValida(corpo, `t=${t},v1=${firma}`, segreto, ora), true);
});
test("firma sbagliata, corpo cambiato, scaduta o mancante", () => {
  assert.equal(firmaStripeValida(corpo, `t=${t},v1=${"0".repeat(64)}`, segreto, ora), false);
  assert.equal(firmaStripeValida(corpo + " ", `t=${t},v1=${firma}`, segreto, ora), false);
  assert.equal(firmaStripeValida(corpo, `t=${t},v1=${firma}`, segreto, ora + 10 * 60_000), false);
  assert.equal(firmaStripeValida(corpo, null, segreto, ora), false);
  assert.equal(firmaStripeValida(corpo, `t=${t},v1=${firma}`, "", ora), false);
});
test("il checkout porta con sé il token per il webhook", () => {
  const p = parametriCheckout({ id: "x", token: "b".repeat(48), importoCent: 299, descrizione: "d", email: null, origine: "https://a.it" });
  assert.equal(p.get("metadata[token]"), "b".repeat(48));
  assert.equal(p.get("customer_email"), null);
});
