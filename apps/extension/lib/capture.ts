/**
 * Recorte y compresión de la imagen que se manda a POST /analyze/read.
 *
 * Corre en el service worker (background.ts), no en el panel, por dos razones:
 * el panel se destruye al cambiar de pestaña (ver tabs.onActivated en
 * background.ts) y `OffscreenCanvas` existe en el worker, así que no hace falta
 * un DOM para recortar.
 *
 * Los topes son espejo de backend/src/utils/imageValidation.ts: el servidor
 * valida igual y rechaza con 400. Si alguno cambia allá, cambia acá.
 */

import { traducciones, type Idioma } from '@/lib/idioma';

/** Los errores de acá llegan tal cual al panel (vía fallarJob con `err.message`). */
const MENSAJES = traducciones({
  es: {
    noPrepara: 'No se pudo preparar la imagen para analizarla.',
    noComprime: 'No se pudo comprimir la imagen.',
    noDescarga: (status: number) => `No se pudo descargar la imagen (${status}).`,
    noEsImagen: 'Eso no parece una imagen.',
  },
  en: {
    noPrepara: "The image couldn't be prepared for analysis.",
    noComprime: "The image couldn't be compressed.",
    noDescarga: (status: number) => `The image couldn't be downloaded (${status}).`,
    noEsImagen: "That doesn't look like an image.",
  },
});

/** Máximo de imágenes por lectura (MAX_IMAGES del backend). */
export const MAX_IMAGES = 3;
/** Tope por imagen ya decodificada (MAX_IMAGE_BYTES del backend). */
export const MAX_IMAGE_BYTES = 1_000_000;
/** Tope del conjunto (MAX_TOTAL_IMAGE_BYTES del backend). */
export const MAX_TOTAL_IMAGE_BYTES = 2_000_000;

/**
 * Lado máximo en píxeles. Es el límite que sugiere el brief (sección 7) y
 * coincide con la resolución a la que los modelos multimodales dejan de ganar
 * detalle: más grande solo gasta bytes.
 */
export const MAX_SIDE_PX = 1568;

/** Calidades que se prueban en orden hasta entrar en MAX_IMAGE_BYTES. */
const CALIDADES = [0.8, 0.65, 0.5, 0.4];

/**
 * Recorte en coordenadas NORMALIZADAS (0 a 1) sobre la imagen capturada.
 *
 * Normalizado y no en píxeles a propósito: la captura viene en píxeles
 * físicos (devicePixelRatio), el panel la muestra escalada al ancho que
 * tenga, y una fracción no depende de ninguna de las dos cosas. Así el panel
 * no necesita saber el tamaño real para pedir un recorte correcto.
 */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Lo que espera POST /analyze/read en `images[]`. */
export interface CaptureImage {
  mimeType: 'image/jpeg';
  dataBase64: string;
}

export interface ImagenPreparada {
  image: CaptureImage;
  /** Tamaño real en bytes ya decodificado — lo que el backend va a medir. */
  bytes: number;
  width: number;
  height: number;
}

/** El recorte entero: equivale a no recortar. */
export const CROP_COMPLETO: CropRect = { x: 0, y: 0, width: 1, height: 1 };

function clamp01(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(1, Math.max(0, valor));
}

/**
 * `btoa` necesita un string binario y `String.fromCharCode(...bytes)` explota
 * la pila con imágenes grandes (cientos de miles de argumentos), así que va
 * por bloques. En el service worker no hay `FileReader`, que sería la otra vía.
 */
function aBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const BLOQUE = 0x8000;
  let binario = '';
  for (let i = 0; i < bytes.length; i += BLOQUE) {
    binario += String.fromCharCode(...bytes.subarray(i, i + BLOQUE));
  }
  return btoa(binario);
}

/**
 * Recorta la imagen, la baja a MAX_SIDE_PX y la comprime a JPEG hasta que
 * entre en MAX_IMAGE_BYTES.
 *
 * El JPEG no es negociable para esta ruta: un PNG de una captura de pantalla
 * (mucho texto, bordes duros) pesa varias veces más que el mismo contenido en
 * JPEG 0.8, y el tope del backend es por imagen decodificada.
 */
export async function recortarYComprimir(
  fuente: Blob | string,
  crop: CropRect = CROP_COMPLETO,
  idioma: Idioma = 'es',
): Promise<ImagenPreparada> {
  const m = MENSAJES[idioma];
  const blob = typeof fuente === 'string' ? await (await fetch(fuente)).blob() : fuente;
  const bitmap = await createImageBitmap(blob);

  try {
    // El recorte llega normalizado: se pasa a píxeles de la imagen real y se
    // clampea, porque un rect de 0 px de lado haría fallar drawImage.
    const sx = Math.round(clamp01(crop.x) * bitmap.width);
    const sy = Math.round(clamp01(crop.y) * bitmap.height);
    const sw = Math.max(1, Math.round(clamp01(crop.width) * bitmap.width));
    const sh = Math.max(1, Math.round(clamp01(crop.height) * bitmap.height));
    const anchoRecorte = Math.min(sw, bitmap.width - sx);
    const altoRecorte = Math.min(sh, bitmap.height - sy);

    // Nunca se agranda: escala 1 si ya entra en MAX_SIDE_PX (ampliar una
    // captura no agrega detalle, solo bytes y ruido de interpolación).
    const escala = Math.min(1, MAX_SIDE_PX / Math.max(anchoRecorte, altoRecorte));
    const width = Math.max(1, Math.round(anchoRecorte * escala));
    const height = Math.max(1, Math.round(altoRecorte * escala));

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(m.noPrepara);
    ctx.drawImage(bitmap, sx, sy, anchoRecorte, altoRecorte, 0, 0, width, height);

    for (const quality of CALIDADES) {
      const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality });
      if (jpeg.size <= MAX_IMAGE_BYTES || quality === CALIDADES[CALIDADES.length - 1]) {
        const dataBase64 = aBase64(await jpeg.arrayBuffer());
        return {
          image: { mimeType: 'image/jpeg', dataBase64 },
          bytes: jpeg.size,
          width,
          height,
        };
      }
    }

    // Inalcanzable: el for de arriba siempre devuelve en la última calidad.
    throw new Error(m.noComprime);
  } finally {
    // Sin esto el bitmap queda ocupando memoria del worker hasta el GC, y acá
    // se manejan imágenes de pantalla completa.
    bitmap.close();
  }
}

/**
 * Trae una imagen por URL para leerla (el camino del menú contextual sobre una
 * imagen: lo que tenemos es `info.srcUrl`, no los bytes).
 *
 * El fetch sale del service worker, que tiene la sesión del usuario en las
 * cookies, así que una imagen de un CDN privado (una historia de Instagram)
 * se baja igual que la bajó la pestaña. Las `data:` URL también funcionan.
 */
export async function traerImagen(srcUrl: string, idioma: Idioma = 'es'): Promise<Blob> {
  const m = MENSAJES[idioma];
  const res = await fetch(srcUrl, { credentials: 'include' });
  if (!res.ok) throw new Error(m.noDescarga(res.status));
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error(m.noEsImagen);
  }
  return blob;
}
