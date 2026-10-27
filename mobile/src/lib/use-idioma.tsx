import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { esIdioma, IDIOMA_POR_DEFECTO, type Idioma, type Textos } from '@/lib/idioma';

const CLAVE = 'aletheia:idioma';

interface IdiomaContexto {
  idioma: Idioma;
  setIdioma: (idioma: Idioma) => void;
}

const Contexto = createContext<IdiomaContexto | null>(null);

/**
 * Espejo de `IdiomaProvider` de la web, sin la parte del servidor.
 *
 * Arranca en castellano y lee la preferencia guardada en el primer efecto. El
 * parpadeo que eso provocaría en la web (ver la página en español y que salte a
 * inglés) acá no se ve: el layout raíz mantiene el splash hasta que están las
 * fuentes y la sesión, y para entonces el idioma ya se leyó.
 */
export function IdiomaProvider({ children }: { children: ReactNode }) {
  const [idioma, setEstado] = useState<Idioma>(IDIOMA_POR_DEFECTO);

  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(CLAVE)
      .then((valor) => {
        if (vivo && esIdioma(valor)) setEstado(valor);
      })
      .catch(() => {
        // sin preferencia guardada se queda en castellano: no es un error
      });
    return () => {
      vivo = false;
    };
  }, []);

  const setIdioma = useCallback((nuevo: Idioma) => {
    setEstado(nuevo);
    void AsyncStorage.setItem(CLAVE, nuevo).catch(() => {});
  }, []);

  const valor = useMemo(() => ({ idioma, setIdioma }), [idioma, setIdioma]);

  return <Contexto value={valor}>{children}</Contexto>;
}

export function useIdioma(): IdiomaContexto {
  const ctx = use(Contexto);
  if (!ctx) throw new Error('useIdioma tiene que usarse dentro de <IdiomaProvider>.');
  return ctx;
}

/** Los textos de la pantalla en el idioma activo. Ver `traducciones` en lib/idioma.ts. */
export function useTextos<T>(textos: Textos<T>): T {
  return textos[useIdioma().idioma];
}

/** El tag BCP 47 del idioma activo, para `toLocaleString` de fechas y números. */
export function useTag(): string {
  return useIdioma().idioma === 'en' ? 'en-US' : 'es-AR';
}
