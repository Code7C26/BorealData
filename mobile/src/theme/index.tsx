import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { dark, light, type Roles } from '@/theme/tokens';

export { font, radio, raw, space, type } from '@/theme/tokens';
export type { Roles } from '@/theme/tokens';

/**
 * Modo de color. `sistema` sigue al teléfono; los otros dos lo pisan.
 *
 * La V1 exige que el modo claro exista (aula, impresión, captura), así que el
 * override es parte del producto y no una preferencia escondida — es el espejo
 * del `theme-toggle` de la web.
 */
export type Modo = 'sistema' | 'dark' | 'light';

const CLAVE = 'aletheia:modo';

interface TemaContexto {
  /** Roles ya resueltos: lo único que consumen los componentes. */
  c: Roles;
  /** 'dark' | 'light' — el modo efectivo, ya resuelto el 'sistema'. */
  esquema: 'dark' | 'light';
  modo: Modo;
  setModo: (modo: Modo) => void;
}

const Contexto = createContext<TemaContexto | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const delSistema = useColorScheme();
  const [modo, setModoState] = useState<Modo>('sistema');

  // La preferencia guardada se lee una vez al arrancar. Mientras no llega se
  // usa 'sistema', que es el default: no hay parpadeo de tema porque el primer
  // frame real ya sale detrás del splash.
  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(CLAVE)
      .then((valor) => {
        if (vivo && (valor === 'dark' || valor === 'light' || valor === 'sistema')) {
          setModoState(valor);
        }
      })
      .catch(() => {
        // Sin preferencia guardada se sigue al sistema: no es un error.
      });
    return () => {
      vivo = false;
    };
  }, []);

  const setModo = useCallback((siguiente: Modo) => {
    setModoState(siguiente);
    void AsyncStorage.setItem(CLAVE, siguiente).catch(() => {});
  }, []);

  const valor = useMemo<TemaContexto>(() => {
    const esquema = modo === 'sistema' ? (delSistema === 'light' ? 'light' : 'dark') : modo;
    return { c: esquema === 'light' ? light : dark, esquema, modo, setModo };
  }, [modo, delSistema, setModo]);

  return <Contexto value={valor}>{children}</Contexto>;
}

/** Los roles del tema activo. `const { c } = useTema()` y después `c.surface`. */
export function useTema(): TemaContexto {
  const ctx = use(Contexto);
  if (!ctx) throw new Error('useTema debe usarse dentro de <TemaProvider>');
  return ctx;
}
