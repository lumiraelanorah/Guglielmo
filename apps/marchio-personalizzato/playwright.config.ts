import { defineConfig } from "@playwright/test";

// Di default prova il sito online; per provare in locale: BASE_URL=http://localhost:3000
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.BASE_URL ?? "https://marchio-personalizzato.vercel.app",
    channel: "chrome",
    viewport: { width: 390, height: 844 },
  },
});
