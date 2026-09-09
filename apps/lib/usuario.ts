/** Deriva las iniciales a mostrar en el avatar circular a partir de un nombre. */
export function iniciales(nombre: string): string {
  const partes = nombre.split(" ").filter(Boolean).slice(0, 2);
  if (partes.length === 0) return "?";
  return partes.map((p) => p.charAt(0).toUpperCase()).join("");
}
