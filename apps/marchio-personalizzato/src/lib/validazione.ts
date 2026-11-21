export function emailValida(e: string): boolean {
  return typeof e === "string" && e.length <= 200 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());
}

/** Toglie l'eventuale prefisso "data:image/jpeg;base64," */
export function daDataUrl(s: string): string {
  const i = s.indexOf("base64,");
  return i >= 0 ? s.slice(i + 7) : s;
}

/** Base64 di un JPEG (inizia con FF D8 FF → "/9j/") e di dimensioni ragionevoli. */
export function jpegBase64Valido(b64: string): boolean {
  return typeof b64 === "string" && b64.startsWith("/9j/") && b64.length < 4_000_000 && /^[A-Za-z0-9+/=]+$/.test(b64);
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOKEN = /^[0-9a-f]{48}$/;
