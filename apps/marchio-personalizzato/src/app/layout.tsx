import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Intestazione } from "@/components/organisms/Intestazione";
import { PiePagina } from "@/components/organisms/PiePagina";
import { temaDiOggi } from "@/lib/server/tema";

export const metadata: Metadata = {
  title: "Etichetta Tua – etichette personalizzate",
  description: "Inquadra il QR sulla confezione, metti la tua foto e la tua dedica sull'etichetta del prodotto e stampala.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = await temaDiOggi();
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;600;700&family=Nunito:wght@400;500;700;800&family=Playfair+Display:ital,wght@0,500;0,700;1,500&display=swap"
        />
      </head>
      <body data-tema={tema}>
        <a href="#contenuto" className="visivamente-nascosto">
          Vai al contenuto
        </a>
        <Intestazione tema={tema} />
        {children}
        <PiePagina />
      </body>
    </html>
  );
}
