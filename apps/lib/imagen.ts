/**
 * Preparación de una imagen antes de mandarla a POST /analyze/read.
 *
 * Es el espejo en la web de `apps/extension/lib/capture.ts`. Los dos nacen del
 * mismo contrato: `backend/src/utils/imageValidation.ts`, que valida lo mismo
 * del lado del servidor y responde 400 si algo no entra. Si cambia un tope
 * allá, cambia en los tres lados.
 *
 * Está duplicado y no compartido a propósito: la extensión corre en un service
 * worker (sin DOM, con OffscreenCanvas) y esto corre en una pestaña con
 * `<canvas>` de toda la vida. Compartirlo obligaría a un paquete común para
 * ahorrar cuarenta líneas que casi no cambian.
 */

import { traducciones, type Idioma } from '@/lib/idioma'

/** Los errores de acá llegan tal cual a la pantalla (vía `err.message`). */
const MENSAJES = traducciones({
  es: {
    noComprime: 'No se pudo comprimir la imagen.',
    noAbre:
      'No pudimos abrir esa imagen. Probá con un JPG, PNG o WebP (las fotos HEIC del iPhone no se pueden leer acá).',
    noPrepara: 'No se pudo preparar la imagen para analizarla.',
  },
  en: {
    noComprime: "The image couldn't be compressed.",
    noAbre:
      "We couldn't open that image. Try a JPG, PNG or WebP (iPhone HEIC photos can't be read here).",
    noPrepara: "The image couldn't be prepared for analysis.",
  },
})

/** Máximo de imágenes por lectura (MAX_IMAGES del backend). */
export const MAX_IMAGES = 3
/** Tope por imagen ya decodificada (MAX_IMAGE_BYTES del backend). */
export const MAX_IMAGE_BYTES = 1_000_000

/**
 * Lado máximo en píxeles. Es el límite que sugiere el brief y coincide con la
 * resolución a la que los modelos multimodales dejan de ganar detalle: más
 * grande solo gasta bytes.
 */
export const MAX_SIDE_PX = 1568

/** Calidades que se prueban en orden hasta entrar en MAX_IMAGE_BYTES. */
const CALIDADES = [0.8, 0.65, 0.5, 0.4]

/**
 * Recorte en coordenadas NORMALIZADAS (0 a 1) sobre la imagen original.
 *
 * Normalizado y no en píxeles a propósito: la imagen se muestra escalada al
 * ancho que tenga la card, y una fracción no depende de eso. Así el componente
 * de recorte no necesita saber el tamaño real para pedir un recorte correcto.
 */
export interface Recorte {
  x: number
  y: number
  width: number
  height: number
}

/** El recorte entero: equivale a no recortar. */
export const RECORTE_COMPLETO: Recorte = { x: 0, y: 0, width: 1, height: 1 }

/** Lo que espera POST /analyze/read en `images[]`. */
export interface ImagenParaLeer {
  mimeType: 'image/jpeg'
  dataBase64: string
}

export interface ImagenPreparada {
  image: ImagenParaLeer
  /** Tamaño real en bytes ya decodificado — lo que el backend va a medir. */
  bytes: number
  width: number
  height: number
}

/** Tipos que el navegador sabe decodificar en un canvas. HEIC, por ejemplo, no. */
export const TIPOS_ACEPTADOS = 'image/jpeg,image/png,image/webp,image/gif,image/avif'

function clamp01(valor: number): number {
  if (!Number.isFinite(valor)) return 0
  return Math.min(1, Math.max(0, valor))
}

/**
 * `btoa` necesita un string binario, y `String.fromCharCode(...bytes)` desborda
 * la pila con imágenes grandes (cientos de miles de argumentos), así que va por
 * bloques.
 */
function aBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const BLOQUE = 0x8000
  let binario = ''
  for (let i = 0; i < bytes.length; i += BLOQUE) {
    binario += String.fromCharCode(...bytes.subarray(i, i + BLOQUE))
  }
  return btoa(binario)
}

function aBlob(canvas: HTMLCanvasElement, quality: number, mensajeError: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(mensajeError))),
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Recorta la imagen, la baja a MAX_SIDE_PX y la comprime a JPEG hasta que entre
 * en MAX_IMAGE_BYTES.
 *
 * El JPEG no es negociable para esta ruta: un PNG de una captura de pantalla
 * (mucho texto, bordes duros) pesa varias veces más que el mismo contenido en
 * JPEG 0.8, y el tope del backend es por imagen decodificada.
 */
export async function prepararImagen(
  archivo: Blob,
  recorte: Recorte = RECORTE_COMPLETO,
  idioma: Idioma = 'es',
): Promise<ImagenPreparada> {
  const m = MENSAJES[idioma]
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(archivo)
  } catch {
    // Pasa con formatos que el navegador no decodifica (HEIC de iPhone es el
    // caso real) y con archivos corruptos. El mensaje tiene que decir qué hacer.
    throw new Error(m.noAbre)
  }

  try {
    const sx = Math.round(clamp01(recorte.x) * bitmap.width)
    const sy = Math.round(clamp01(recorte.y) * bitmap.height)
    const anchoRecorte = Math.min(
      Math.max(1, Math.round(clamp01(recorte.width) * bitmap.width)),
      bitmap.width - sx,
    )
    const altoRecorte = Math.min(
      Math.max(1, Math.round(clamp01(recorte.height) * bitmap.height)),
      bitmap.height - sy,
    )

    // Nunca se agranda: escala 1 si ya entra en MAX_SIDE_PX (ampliar no agrega
    // detalle, solo bytes y ruido de interpolación).
    const escala = Math.min(1, MAX_SIDE_PX / Math.max(anchoRecorte, altoRecorte))
    const width = Math.max(1, Math.round(anchoRecorte * escala))
    const height = Math.max(1, Math.round(altoRecorte * escala))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error(m.noPrepara)
    ctx.drawImage(bitmap, sx, sy, anchoRecorte, altoRecorte, 0, 0, width, height)

    for (const quality of CALIDADES) {
      const jpeg = await aBlob(canvas, quality, m.noComprime)
      if (jpeg.size <= MAX_IMAGE_BYTES || quality === CALIDADES[CALIDADES.length - 1]) {
        return {
          image: { mimeType: 'image/jpeg', dataBase64: aBase64(await jpeg.arrayBuffer()) },
          bytes: jpeg.size,
          width,
          height,
        }
      }
    }

    // Inalcanzable: el for de arriba siempre devuelve en la última calidad.
    throw new Error(m.noComprime)
  } finally {
    // Sin esto el bitmap queda ocupando memoria hasta el GC, y acá se manejan
    // capturas de pantalla enteras.
    bitmap.close()
  }
}
