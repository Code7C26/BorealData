import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { IDIOMA_KEY, esIdioma, traducciones, type Idioma, type Textos } from '@/lib/idioma';

const IdiomaContext = createContext<Idioma | null>(null);

const TITULO = traducciones({
  es: 'AletheIA — Analizar esta página',
  en: 'AletheIA — Analyze this page',
});

/**
 * El idioma del panel, al día.
 *
 * `inicial` ya viene resuelto (main.tsx lo lee de storage antes del primer render), así
 * que no hay un frame en el idioma equivocado. Después escucha storage.onChanged: si
 * cambiás el idioma en la web con el panel abierto, el panel cambia en el momento.
 */
export function IdiomaProvider({ inicial, children }: { inicial: Idioma; children: ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(inicial);

  useEffect(() => {
    const alCambiar = (cambios: Record<string, { newValue?: unknown }>, area: string) => {
      const nuevo = cambios[IDIOMA_KEY]?.newValue;
      if (area === 'local' && esIdioma(nuevo)) setIdioma(nuevo);
    };
    browser.storage.onChanged.addListener(alCambiar);
    return () => browser.storage.onChanged.removeListener(alCambiar);
  }, []);

  // El <html> del panel es estático (index.html): el lang (para los lectores de pantalla)
  // y el título se acomodan acá.
  useEffect(() => {
    document.documentElement.lang = idioma;
    document.title = TITULO[idioma];
  }, [idioma]);

  return <IdiomaContext.Provider value={idioma}>{children}</IdiomaContext.Provider>;
}

export function useIdioma(): Idioma {
  const idioma = useContext(IdiomaContext);
  if (!idioma) throw new Error('useIdioma tiene que usarse dentro de <IdiomaProvider>.');
  return idioma;
}

/** Los textos del componente en el idioma activo. Ver `traducciones` en lib/idioma.ts. */
export function useTextos<T>(textos: Textos<T>): T {
  return textos[useIdioma()];
}
