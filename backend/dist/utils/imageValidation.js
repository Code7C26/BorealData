"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_TOTAL_IMAGE_BYTES = exports.MAX_IMAGE_BYTES = exports.MAX_IMAGES = void 0;
exports.sniffImageType = sniffImageType;
exports.validateImages = validateImages;
/** Máximo de imágenes por lectura (el cliente ya las reduce; esto es la red del servidor). */
exports.MAX_IMAGES = 3;
/** Tope por imagen ya decodificada. El cliente baja a 1568 px / JPEG ~0.8: ~200-400 kB normalmente. */
exports.MAX_IMAGE_BYTES = 1000000;
/** Tope del conjunto. En base64 son ~2,7 MB: por eso /analyze/read acepta bodies de hasta 3 MB. */
exports.MAX_TOTAL_IMAGE_BYTES = 2000000;
/**
 * Detecta el formato real por los primeros bytes. El `mimeType` que declara el cliente no
 * se usa para nada: cualquiera puede mandar un ejecutable diciendo que es image/png.
 */
function sniffImageType(buf) {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
        return "image/jpeg";
    if (buf.length >= 8 &&
        buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return "image/png";
    }
    if (buf.length >= 12 &&
        buf.subarray(0, 4).toString("ascii") === "RIFF" &&
        buf.subarray(8, 12).toString("ascii") === "WEBP") {
        return "image/webp";
    }
    return null;
}
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const DATA_URL_PREFIX_RE = /^data:[^;,]*;base64,/i;
function validateImages(raw) {
    if (!Array.isArray(raw) || raw.length === 0) {
        return { ok: false, error: "Falta 'images': mandá entre 1 y " + exports.MAX_IMAGES + " imágenes." };
    }
    if (raw.length > exports.MAX_IMAGES) {
        return { ok: false, error: `Demasiadas imágenes (máximo ${exports.MAX_IMAGES}).` };
    }
    const images = [];
    let total = 0;
    for (const item of raw) {
        const b64 = typeof item === "object" && item !== null && typeof item.dataBase64 === "string"
            ? item.dataBase64.replace(DATA_URL_PREFIX_RE, "").trim()
            : null;
        if (!b64 || !BASE64_RE.test(b64)) {
            return { ok: false, error: "Cada imagen necesita 'dataBase64' en base64 válido." };
        }
        // Se descarta por tamaño estimado antes de decodificar un buffer enorme.
        const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
        const estimated = Math.floor((b64.length * 3) / 4) - padding;
        if (estimated > exports.MAX_IMAGE_BYTES) {
            return { ok: false, error: `Una imagen supera el máximo de ${exports.MAX_IMAGE_BYTES / 1000} kB. Reducila antes de mandarla.` };
        }
        const buf = Buffer.from(b64, "base64");
        const mimeType = sniffImageType(buf);
        if (!mimeType) {
            return { ok: false, error: "Formato de imagen no soportado (se aceptan JPEG, PNG y WebP)." };
        }
        total += buf.length;
        if (total > exports.MAX_TOTAL_IMAGE_BYTES) {
            return { ok: false, error: `Las imágenes superan en total ${exports.MAX_TOTAL_IMAGE_BYTES / 1000000} MB.` };
        }
        images.push({ mimeType, dataBase64: b64 });
    }
    return { ok: true, images };
}
