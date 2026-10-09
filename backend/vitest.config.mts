import { defineConfig } from "vitest/config";

/**
 * El código del backend compila a CommonJS pero escribe los imports relativos con
 * extensión `.js` (`./types.js`), que es lo que TypeScript espera y lo que termina
 * existiendo en `dist/`. En los tests nada pasa por `tsc`: Vitest resuelve los módulos
 * él mismo contra `src/`, donde esos archivos son `.ts` y el `.js` no existe. Este
 * plugin traduce la extensión al resolver, así los tests importan exactamente los
 * mismos especificadores que el código de producción y no hay dos verdades.
 */
export default defineConfig({
  plugins: [
    {
      name: "resolver-js-a-ts",
      enforce: "pre",
      async resolveId(source, importer) {
        if (!importer || !source.startsWith(".") || !source.endsWith(".js")) return null;
        const resuelto = await this.resolve(source.replace(/\.js$/, ".ts"), importer, {
          skipSelf: true,
        });
        return resuelto ?? null;
      },
    },
  ],
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
