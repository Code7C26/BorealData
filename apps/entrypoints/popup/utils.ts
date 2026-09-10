/**
 * Devuelve una etiqueta corta para mostrar qué se analizó: el dominio si el
 * input es una URL válida, o un fragmento del texto pegado.
 */
export function getAnalyzedLabel(input: string): string {
  const trimmed = input.trim();
  try {
    return new URL(trimmed).hostname;
  } catch {
    return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
  }
}
