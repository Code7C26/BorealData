import type { AnalyzeResponse, CaptureReading, ClientContentKind, Platform } from '@/lib/api';

/**
 * El pizarrón entre pantallas del flujo de análisis.
 *
 * Expo Router pasa datos por la URL, y esto no entra en una URL: una captura en
 * base64 son cientos de kB, y el resultado completo tiene el razonamiento y las
 * fuentes. Un módulo con estado es el equivalente del `sessionStorage` que usa
 * la web, con la diferencia de que acá se vacía solo al cerrar la app — que es
 * exactamente lo que queremos: el borrador de un análisis anterior no tiene que
 * quedar pegado (mismo bug que ya se arregló en la web).
 *
 * No es un store reactivo a propósito: cada pantalla lo lee una vez al montar.
 */

/** Lo que la pantalla de "analizando" tiene que ejecutar. */
export type Pendiente =
  | { tipo: 'url'; url: string }
  | {
      tipo: 'contenido';
      kind: ClientContentKind;
      text: string;
      platform?: Platform | null;
      author?: string | null;
    };

let pendiente: Pendiente | null = null;
/**
 * La imagen tal como salió de la galería, entre el selector y el recorte.
 * Se guarda sin procesar (ni achicar ni pasar a base64) porque el recorte
 * necesita el original: recortar sobre una versión ya reducida pierde el
 * detalle justo donde más hace falta, que es el texto chico del posteo.
 */
let elegida: { uri: string; width: number; height: number } | null = null;
/** La imagen ya recortada y lista para transcribir, entre el recorte y la revisión. */
let captura: { mimeType: string; dataBase64: string; uri: string } | null = null;
/** Resultados ya traídos, para que la pantalla de resultado abra sin esperar red. */
const resultados = new Map<string, AnalyzeResponse>();
/** La transcripción que devolvió el paso 1, para prellenar la revisión. */
let lectura: CaptureReading | null = null;

/** Id con el que viaja un análisis que no tiene fila pública que mostrar. */
export const ID_LOCAL = 'ultimo';

export const analisis = {
  ponerPendiente(valor: Pendiente) {
    pendiente = valor;
  },
  tomarPendiente(): Pendiente | null {
    const valor = pendiente;
    pendiente = null;
    return valor;
  },

  ponerElegida(valor: { uri: string; width: number; height: number }) {
    elegida = valor;
  },
  verElegida() {
    return elegida;
  },

  ponerCaptura(valor: { mimeType: string; dataBase64: string; uri: string }) {
    captura = valor;
  },
  verCaptura() {
    return captura;
  },
  limpiarCaptura() {
    elegida = null;
    captura = null;
    lectura = null;
  },

  ponerLectura(valor: CaptureReading) {
    lectura = valor;
  },
  verLectura() {
    return lectura;
  },

  ponerResultado(id: string, valor: AnalyzeResponse) {
    // Solo se guarda el último: el historial es la memoria de verdad, esto es
    // nada más el puente entre "analizando" y la pantalla de resultado.
    resultados.clear();
    resultados.set(id, valor);
  },
  verResultado(id: string) {
    return resultados.get(id) ?? null;
  },
};
