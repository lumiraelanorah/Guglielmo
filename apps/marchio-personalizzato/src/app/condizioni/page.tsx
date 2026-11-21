import { Pagina } from "@/components/templates/Pagina";

export const metadata = { title: "Condizioni e privacy" };

export default function Condizioni() {
  return (
    <Pagina stretta>
      <h1>Condizioni e privacy</h1>
      <p className="campo__aiuto">Versione di prova – testo da far rivedere prima dell&apos;apertura al pubblico.</p>
      <h2>Cosa compri</h2>
      <p>
        Compri il file digitale della tua etichetta personalizzata (PDF da stampare e immagine JPG), da stampare
        sull&apos;adesivo contenuto nella confezione. Non sono comprese stampa né spedizione. Trattandosi di un contenuto
        digitale personalizzato e fornito subito dopo il pagamento, non è previsto il diritto di recesso una volta scaricato il
        file.
      </p>
      <h2>La tua foto e le tue parole</h2>
      <ul>
        <li>Puoi caricare solo foto tue o di cui hai il permesso delle persone ritratte.</li>
        <li>Non sono ammessi contenuti offensivi, violenti, discriminatori o che violano diritti di altri.</li>
        <li>Puoi modificare solo gli spazi indicati dal marchio: le informazioni obbligatorie del prodotto restano sempre visibili.</li>
        <li>Possiamo rimuovere le etichette che violano queste regole.</li>
      </ul>
      <h2>Privacy</h2>
      <ul>
        <li>Raccogliamo solo: l&apos;etichetta che crei (con la foto dentro), il testo facoltativo e la tua email per la ricevuta.</li>
        <li>La foto originale non viene conservata: salviamo solo l&apos;etichetta finita, in un archivio privato.</li>
        <li>Il file è scaricabile solo con il link personale che ricevi dopo il pagamento.</li>
        <li>Etichetta e foto vengono cancellate automaticamente dopo 30 giorni; le bozze non pagate dopo 2 giorni.</li>
        <li>Il pagamento è gestito dal fornitore di pagamenti: non vediamo i dati della tua carta.</li>
      </ul>
      <h2>Il codice QR</h2>
      <p>Il QR sulla confezione serve ad aprire il modello di etichetta del prodotto. Non certifica l&apos;autenticità del prodotto.</p>
    </Pagina>
  );
}
