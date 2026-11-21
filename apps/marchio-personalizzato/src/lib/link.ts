export function linkGrazie(origine: string, id: string, token: string): string {
  return `${origine}/grazie?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`;
}

export function linkModello(origine: string, codice: string): string {
  return `${origine}/m/${encodeURIComponent(codice)}`;
}
