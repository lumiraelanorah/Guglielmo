import { test } from "node:test";
import assert from "node:assert/strict";
import { parametriCheckout } from "../../src/lib/server/stripe";
import { emailRicevuta } from "../../src/lib/server/email";
import { linkGrazie } from "../../src/lib/link";

test("stripe: parametri del checkout", () => {
  const p = parametriCheckout({
    id: "11111111-1111-1111-1111-111111111111",
    token: "a".repeat(48),
    importoCent: 299,
    descrizione: "Etichetta personalizzata – Panettone della Casa",
    email: "cliente@example.it",
    origine: "https://esempio.vercel.app",
  });
  assert.equal(p.get("mode"), "payment");
  assert.equal(p.get("line_items[0][price_data][currency]"), "eur");
  assert.equal(p.get("line_items[0][price_data][unit_amount]"), "299");
  assert.equal(p.get("line_items[0][quantity]"), "1");
  assert.equal(p.get("customer_email"), "cliente@example.it");
  assert.equal(p.get("metadata[personalizzazione_id]"), "11111111-1111-1111-1111-111111111111");
  assert.match(p.get("success_url")!, /^https:\/\/esempio\.vercel\.app\/grazie\?id=1111.*&t=a{48}&session_id=\{CHECKOUT_SESSION_ID\}$/);
  assert.match(p.get("cancel_url")!, /^https:\/\/esempio\.vercel\.app\//);
});

test("email: ricevuta con link per riscaricare", () => {
  const e = emailRicevuta({
    prodotto: "Panettone della Casa",
    marchio: "Marchio Prova",
    importoCent: 299,
    link: "https://x.it/grazie?id=1&t=2",
  });
  assert.match(e.oggetto, /Panettone della Casa/);
  assert.match(e.html, /2,99 €/);
  assert.match(e.html, /https:\/\/x\.it\/grazie\?id=1&amp;t=2/);
  assert.match(e.testo, /30 giorni/);
  assert.doesNotMatch(e.html, /<script/i);
});

test("email: i nomi vengono protetti dall'HTML", () => {
  const e = emailRicevuta({ prodotto: "<b>X</b>", marchio: "A&B", importoCent: 100, link: "https://x.it" });
  assert.match(e.html, /&lt;b&gt;X&lt;\/b&gt;/);
  assert.match(e.html, /A&amp;B/);
});

test("link della pagina di ringraziamento", () => {
  assert.equal(linkGrazie("https://x.it", "abc", "def"), "https://x.it/grazie?id=abc&t=def");
});
