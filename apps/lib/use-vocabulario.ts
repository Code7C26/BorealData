'use client'

import { useTextos } from '@/lib/use-idioma'
import { VOCABULARIO } from '@/lib/verdict'

/**
 * VERDICT, CONFIDENCE y STANCE en el idioma activo.
 *
 * Devuelve los mismos nombres que exporta lib/verdict.ts a propósito: el componente hace
 * `const { VERDICT } = useVocabulario()` y el resto de su código no cambia.
 */
export function useVocabulario() {
  return useTextos(VOCABULARIO)
}
