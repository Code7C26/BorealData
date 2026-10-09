/**
 * Log estructurado, una línea de JSON por evento.
 *
 * Por qué JSON y no `console.log("analizando " + url)`: Cloud Run (y cualquier
 * recolector de logs decente) parsea el stdout como JSON y convierte cada campo en algo
 * filtrable — se puede preguntar "cuántos análisis fallaron ayer", "cuál es la latencia
 * p95 de Gemini" o "qué porcentaje de fuentes quedó con link" sin salir de la consola de
 * logs. Con texto suelto, cada una de esas preguntas es un grep a mano.
 *
 * `severity` es la clave que mira Cloud Logging para pintar el nivel; `message` es la que
 * usa para el resumen de una línea. Los dos nombres son los que espera Google, por eso no
 * son `level` y `msg`.
 *
 * ── Qué NO se loguea (esto es parte del contrato con el usuario, no una preferencia) ──
 * La política de privacidad dice que el contenido que la persona analiza no queda en los
 * registros. Entonces: nunca el texto de un posteo, nunca una imagen, nunca la
 * transcripción. De un análisis de contenido se loguea el tipo y la plataforma; el
 * tamaño en caracteres va porque es un número, no el contenido. De un análisis de enlace
 * sí va la URL: ya se guarda en la base y es el dato que hace falta para reproducir un
 * problema.
 */

type Severidad = "INFO" | "WARNING" | "ERROR";

/** Campos sueltos del evento. Valores simples: esto termina en una línea de JSON. */
export type Campos = Record<string, string | number | boolean | null | undefined>;

function emitir(severity: Severidad, message: string, campos: Campos = {}) {
  const entrada: Record<string, unknown> = { severity, message, ...campos };

  // Los `undefined` desaparecen al serializar, así que no hace falta filtrarlos: un campo
  // que no aplica simplemente no sale en la línea.
  const linea = JSON.stringify(entrada);

  // ERROR y WARNING van a stderr para que se distingan aunque el recolector no parsee
  // JSON (por ejemplo, mirando la terminal en desarrollo).
  if (severity === "ERROR" || severity === "WARNING") {
    process.stderr.write(`${linea}\n`);
  } else {
    process.stdout.write(`${linea}\n`);
  }
}

export const log = {
  info: (message: string, campos?: Campos) => emitir("INFO", message, campos),
  warn: (message: string, campos?: Campos) => emitir("WARNING", message, campos),
  error: (message: string, campos?: Campos) => emitir("ERROR", message, campos),
};

/** Mensaje de un error desconocido, sin stack: a los logs va el qué, no el volcado. */
export function mensajeDeError(err: unknown): string {
  return err instanceof Error ? err.message : "Error desconocido";
}

/**
 * Cronómetro para medir cuánto tardó una operación. Se usa así:
 *
 *   const reloj = cronometro();
 *   ...
 *   log.info("analyze.ok", { latencyMs: reloj() });
 */
export function cronometro(): () => number {
  const inicio = Date.now();
  return () => Date.now() - inicio;
}

/**
 * Resumen de las fuentes de un análisis, para poder seguir en los logs la métrica que
 * importa: qué proporción de las fuentes que el motor nombra termina con un link real.
 *
 * Es la métrica que habría hecho visible el bug del cruce de grounding (8-oct-2026), que
 * estuvo roto sin que nadie lo notara porque la app seguía funcionando: el 90% de las
 * fuentes salía sin link y la única forma de enterarse era mirar la base a mano.
 */
export function resumenDeFuentes(sources: Array<{ url: string | null }>): Campos {
  const conUrl = sources.filter((s) => s.url !== null).length;
  return { sources: sources.length, sourcesConUrl: conUrl };
}
