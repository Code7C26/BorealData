/**
 * Se ejecuta DENTRO de la pestaña del usuario (vía browser.scripting.executeScript),
 * no en el popup. Por eso no puede depender de nada externo a esta función:
 * solo tiene acceso al DOM de esa página.
 */
export function extractPageText(): { title: string; text: string } {
  const title = document.title;

  // Heurística simple: preferimos <article> si existe (la mayoría de los
  // sitios de noticias lo usan para el cuerpo de la nota); si no, el body.
  const article = document.querySelector('article');
  const raw = (article?.innerText || document.body?.innerText || '').trim();

  // Límite arbitrario para no mandar páginas enteras de miles de palabras.
  const MAX_CHARS = 5000;
  const text = raw.replace(/\s+/g, ' ').slice(0, MAX_CHARS);

  return { title, text };
}
