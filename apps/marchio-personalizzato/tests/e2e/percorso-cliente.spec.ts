import { test, expect } from "@playwright/test";

test("il cliente crea, paga (prova) e scarica la sua etichetta", async ({ page }) => {
  await page.goto("/m/prova");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Panettone della Casa");

  // foto generata al volo
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 1000;
    const x = c.getContext("2d")!;
    x.fillStyle = "#4a90d9";
    x.fillRect(0, 0, 800, 1000);
    const b: Blob = await new Promise((r) => c.toBlob((bb) => r(bb!), "image/jpeg", 0.9));
    const dt = new DataTransfer();
    dt.items.add(new File([b], "foto.jpg", { type: "image/jpeg" }));
    const inp = document.querySelector<HTMLInputElement>("[data-testid=scegli-foto]")!;
    inp.files = dt.files;
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByRole("button", { name: "Avanti" })).toBeEnabled();
  await page.getByRole("button", { name: "Avanti" }).click();

  await page.getByLabel("Dedica").fill("Alla nonna più dolce del mondo");
  await page.getByLabel("Data", { exact: true }).fill("2026-12-25");
  await expect(page.getByText("Sull'etichetta: 25 dicembre 2026")).toBeVisible();
  await page.getByRole("button", { name: "Vedi l'anteprima" }).click();

  await page.getByLabel("La tua email").fill("prova@example.com");
  await page.getByText("La foto è mia").click();
  await page.getByText("Accetto le").click();
  await page.getByRole("button", { name: /Paga 2,99/ }).click();

  await expect(page).toHaveURL(/pagamento-prova/);
  await page.getByRole("button", { name: /Conferma il pagamento di prova/ }).click();
  await expect(page).toHaveURL(/grazie/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("pronta");

  const pdf = await page.request.get(await page.getByRole("link", { name: /Scarica il PDF/ }).getAttribute("href").then((h) => h!));
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
});

test("parole offensive bloccate", async ({ page }) => {
  await page.goto("/m/prova");
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 400;
    const b: Blob = await new Promise((r) => c.toBlob((bb) => r(bb!), "image/jpeg"));
    const dt = new DataTransfer();
    dt.items.add(new File([b], "f.jpg", { type: "image/jpeg" }));
    const inp = document.querySelector<HTMLInputElement>("[data-testid=scegli-foto]")!;
    inp.files = dt.files;
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByLabel("Dedica").fill("sei uno str0nz0");
  await expect(page.getByText("parole non consentite")).toBeVisible();
  await expect(page.getByRole("button", { name: "Vedi l'anteprima" })).toBeDisabled();
});

test("pagine riservate chiedono l'accesso", async ({ page }) => {
  await page.goto("/azienda");
  await expect(page.getByRole("link", { name: "Entra o registrati" }).first()).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("main").getByRole("link", { name: "Entra" })).toBeVisible();
});

test("download senza pagamento non consentito", async ({ request }) => {
  const r = await request.get(`/api/scarica?id=00000000-0000-4000-8000-000000000000&t=${"0".repeat(48)}`);
  expect(r.status()).toBe(404);
});
