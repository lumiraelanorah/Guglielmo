# Etichetta Tua – etichette personalizzate (cartella: apps/marchio-personalizzato)

## Cosa fa (approvato il 2026-11-21, da far rivedere a papà)
Un'azienda mette un QR sulla confezione. Il cliente lo inquadra, mette foto, dedica e data dentro il
modello del marchio, vede l'anteprima fedele alla stampa, paga 2,99 € e scarica il PDF da stampare
sull'adesivo 100×70 mm della confezione. L'azienda ha un'area per caricare il modello, disegnare le
zone modificabili e scaricare il QR. L'amministratore (Guglielmo) approva aziende e modelli, controlla
le etichette vendute e sceglie il tema del sito.

Motto: "Il prodotto appartiene al marchio. La storia appartiene a chi lo sceglie."

## Da rivedere con papà (le decisioni sono sue)
Queste risposte le ha date chi ha avviato il progetto; vanno richieste a Guglielmo alla revisione:
1. Prodotto di prova: inventato ("Panettone della Casa" di "Marchio Prova").
2. Prezzo: 2,99 €.
3. Cosa può scrivere il cliente: dedica e data.
4. Stile: a temi scelti dall'amministratore. Calendario iniziale: San Valentino dal 1/1, Pasqua dal
   1/3, Regalo dal 1/7, Natale dal 1/11. Modificabile (anche "sempre un tema") da /admin.

## Modelli di prova
- `/m/prova` – Panettone della Casa (foto rettangolare, dedica e data)
- `/m/birra` – Birra della Casa: grafica originale stile etichetta d'epoca, foto al centro in una
  cornice ovale con il consiglio "alza una birra", dedica nel nastro (max 30) e data.
  Nota: l'etichetta Jack Daniel's fatta da papà con ChatGPT non è stata copiata (marchio di altri);
  inserire in automatico una birra in mano alla persona richiederebbe un servizio di immagini AI a pagamento.

## Percorso del cliente
1. QR → `/m/<codice>` (registra una "scansione").
2. Sceglie/scatta la foto, la sposta col dito e la ingrandisce dentro la zona foto.
3. Dedica (max 60 caratteri, filtro parole offensive; parole dubbie → "da controllare") e data.
4. Anteprima con filigrana "ANTEPRIMA · NON STAMPABILE" (sempre, fino al pagamento) e linea di taglio (registra un'"anteprima"), email, consenso foto + condizioni.
5. Paga: Stripe Checkout se configurato, altrimenti pagina "pagamento di prova".
6. `/grazie?id&t`: anteprima, PDF di stampa (100×70 mm, abbondanza 3 mm, segni di taglio, 300 dpi) e JPG.

## Percorso dell'azienda (`/accedi`, `/azienda`)
Registrazione con nome azienda/email/password (conferma email), modelli: carica grafica
(PNG/JPG, ideale 1252×898 px), disegna zone foto/dedica/data, carattere, colore, lunghezza max,
invia per l'approvazione. Quando pubblicato: link, QR (PNG 1024 px) e statistiche (visite, anteprime, acquisti).
Le modifiche a un modello pubblicato restano "in attesa" (colonna modifiche_in_attesa): online resta
la versione approvata e il QR continua a funzionare finché l'amministratore non le approva.
Un modello pubblicato non si può eliminare; uno con etichette ancora scaricabili neanche.

## Amministrazione (`/admin`)
Tema del sito (automatico a calendario o fisso), modelli da approvare/rimandare/ritirare con nota,
aziende da approvare, etichette vendute (vedi, "va bene", rimuovi), elenco amministratori.
Admin = email in `marchio_admin` con accesso creato ed email confermata.

## Dati salvati (Supabase idee-di-papa, prefisso marchio_)
- marchio_aziende, marchio_modelli, marchio_personalizzazioni (immagine finita, testo, email, stato),
  marchio_ordini, marchio_eventi, marchio_impostazioni (tema), marchio_admin
- Schema privato marchio_privato: segreto del server e funzione di pulizia
- Archivio pubblico `marchio-modelli` per le grafiche dei marchi
- RLS attiva ovunque; i clienti passano solo dal server (funzioni protette da segreto)
- Pulizia automatica (pg_cron, 3:15): etichette dopo 30 giorni, bozze dopo 3, email ordini dopo 30
- Un'azienda revocata non vende più (i suoi modelli spariscono dal sito)
- Limite: 200 bozze all'ora per modello

## Limiti noti della prova
- L'immagine finale è composta sul telefono del cliente: chi chiama il servizio direttamente potrebbe
  mandare un'immagine diversa. Rimedio: controllo dell'admin in "Etichette vendute".
- Le statistiche (visite, anteprime) non distinguono visite ripetute.

## Dove sta
- App online: https://marchio-personalizzato.vercel.app (prova: /m/prova)
- Archivio: lumiraelanorah/Guglielmo → apps/marchio-personalizzato
- Supabase: idee-di-papa (tmwtbvassbgobqjiusyy), prefisso marchio_
- Vercel: progetto marchio-personalizzato (funzioni a Francoforte)
- Email: Resend attivo (chiave solo invio). Senza dominio verificato le ricevute partono solo verso
  lumiraelanorah@gmail.com (variabile RESEND_SOLO_A): toglierla quando c'è un dominio
- Supabase Auth: Site URL e redirect impostati sull'indirizzo del sito (21/11)
- Il vecchio progetto Vercel "guglielmo" (radice dell'archivio) è stato eliminato il 21/11
- Pagamenti: Stripe predisposto, non attivo (manca la chiave) → pagamento simulato

## Variabili (Vercel)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, MARCHIO_SEGRETO_SERVER (impostate);
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (webhook su /api/stripe/webhook, eventi
checkout.session.completed e checkout.session.async_payment_succeeded), RESEND_API_KEY,
EMAIL_MITTENTE (facoltative, da aggiungere).

## Test
- `npm test`: logica (temi, testo, zone, foto, PDF, Stripe, email) e componenti
- `npm run test:e2e`: percorso cliente contro il sito online (BASE_URL per altro indirizzo)

## Passi
- [x] Dati, regole di accesso, funzioni, pulizia 30 giorni
- [x] Percorso cliente completo con pagamento di prova e PDF
- [x] Area azienda: accesso, grafica, zone, approvazione, QR, statistiche
- [x] Amministrazione: temi, approvazioni, vendite e segnalazioni, amministratori
- [ ] Revisione di papà (vedi "Da rivedere")
- [x] Site URL Supabase, chiave Resend, admin = lumiraelanorah@gmail.com (gestito da Claude per papà)
- [ ] Pagamenti veri: serve account Stripe dell'azienda (dati aziendali, IBAN) e, per uso
      commerciale, Vercel Pro (20 $/mese): decisione di papà

## Stato
online (prova pilota)
