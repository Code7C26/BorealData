'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { broadcastIdioma } from '@/lib/extension-bridge'
import { escribirCookieIdioma, type Idioma, type Textos } from '@/lib/idioma'

type IdiomaContextValue = {
  idioma: Idioma
  setIdioma: (idioma: Idioma) => void
}

const IdiomaContext = createContext<IdiomaContextValue | null>(null)

/**
 * Arranca con el idioma que leyó el servidor de la cookie, así el primer render del
 * cliente coincide con el HTML y no hay salto al hidratar.
 *
 * Al cambiar: el estado actualiza al instante todo lo que es de cliente, y
 * `router.refresh()` vuelve a pedir lo que renderiza el servidor (las páginas legales,
 * el `<title>`), que ya lee la cookie nueva.
 */
export function IdiomaProvider({ idioma: inicial, children }: { idioma: Idioma; children: ReactNode }) {
  const router = useRouter()
  const [idioma, setEstado] = useState<Idioma>(inicial)
  const [, startTransition] = useTransition()

  const setIdioma = useCallback(
    (nuevo: Idioma) => {
      escribirCookieIdioma(nuevo)
      document.documentElement.lang = nuevo
      setEstado(nuevo)
      startTransition(() => router.refresh())
    },
    [router],
  )

  // La extensión de Chrome sigue al idioma de la web: se lo avisamos al montar (cualquier
  // página abierta la sincroniza) y en cada cambio.
  useEffect(() => {
    broadcastIdioma(idioma)
  }, [idioma])

  const valor = useMemo(() => ({ idioma, setIdioma }), [idioma, setIdioma])

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>
}

export function useIdioma(): IdiomaContextValue {
  const ctx = useContext(IdiomaContext)
  if (!ctx) throw new Error('useIdioma tiene que usarse dentro de <IdiomaProvider>.')
  return ctx
}

/** Los textos del componente en el idioma activo. Ver `traducciones` en lib/idioma.ts. */
export function useTextos<T>(textos: Textos<T>): T {
  return textos[useIdioma().idioma]
}
