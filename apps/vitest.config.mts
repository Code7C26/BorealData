import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Tests de la lógica pura del front (`lib/`), no de componentes: lo que hay acá es el
 * vocabulario del veredicto y la normalización, que son las piezas donde un error no se
 * ve en pantalla. Para los componentes seguimos midiendo el DOM en el navegador, que es
 * lo que detecta los problemas reales de layout.
 *
 * No importa next.config.ts a propósito: estos módulos no dependen de Next, y meter el
 * pipeline del framework en el test solo agrega formas de que falle por algo ajeno.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
})
