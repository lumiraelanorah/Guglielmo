export function formattaPrezzo(centesimi: number): string {
  const euro = Math.floor(centesimi / 100);
  const cent = String(centesimi % 100).padStart(2, "0");
  return `${euro},${cent} €`;
}
