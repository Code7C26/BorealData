"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripControlChars = stripControlChars;
/**
 * Saca bytes NUL y caracteres de control (0x00-0x1F, 0x7F) de un string, y le hace
 * trim. Postgres rechaza NUL en columnas `text` (rompería el INSERT en analyses/users),
 * y caracteres de control sueltos en campos como `fullName` o el título scrapeado no
 * aportan nada legítimo — solo sirven para inyectar basura o intentos de manipular
 * cómo se ve/procesa el dato más adelante (ej. en el prompt que arma geminiClient.ts).
 *
 * `keepNewlines` conserva \n y \t (para el cuerpo del artículo scrapeado, donde los
 * saltos de línea son parte del contenido real); para campos de una sola línea
 * (fullName, título, URL) se dejan afuera también.
 */
function stripControlChars(input, keepNewlines = false) {
    const pattern = keepNewlines
        ? /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g
        : /[\x00-\x1F\x7F]/g;
    return input.replace(pattern, "").trim();
}
