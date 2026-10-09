'use client'

import { useSyncExternalStore } from 'react'
import { applyTheme, leerTemaActual, suscribirAlTema, type Theme } from '@/lib/theme'

/**
 * El modo activo y cómo alternarlo. Lo usan el toggle de la barra y el selector de
 * Configuración, que antes tenían el mismo `useState` + `useEffect` copiado.
 *
 * Ver `leerTemaActual` en lib/theme.ts para por qué va con useSyncExternalStore.
 */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; alternar: () => void } {
  const theme = useSyncExternalStore(suscribirAlTema, leerTemaActual, () => 'dark' as Theme)

  return {
    theme,
    setTheme: applyTheme,
    alternar: () => applyTheme(theme === 'dark' ? 'light' : 'dark'),
  }
}
