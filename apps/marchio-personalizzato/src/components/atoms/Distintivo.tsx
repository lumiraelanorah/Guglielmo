const TESTI: Record<string, string> = {
  bozza: "Bozza",
  in_revisione: "In attesa di approvazione",
  pubblicato: "Pubblicato",
  rifiutato: "Da correggere",
  pagata: "Pagata",
  scaricata: "Scaricata",
  rimossa: "Rimossa",
  si: "Approvata",
  no: "Da approvare",
  attesa: "In attesa",
};

export function Distintivo({ stato }: { stato: string }) {
  return <span className={`distintivo distintivo--${stato}`}>{TESTI[stato] ?? stato}</span>;
}
