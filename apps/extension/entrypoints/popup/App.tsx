import { useEffect, useState, type KeyboardEvent } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import ResultView from './ResultView';
import LoginGate from './LoginGate';
import { extractPageText } from './pageExtractor';
import { getStoredAuth, clearStoredAuth } from './auth';
import { WEB_APP_URL } from './config';
import type { AnalysisResult, AuthState } from './types';
import { getAnalyzedLabel } from './utils';
import './App.css';

type Status = 'idle' | 'loading' | 'done' | 'error';
type AuthStatus = 'loading' | AuthState | null;
export type ExtractionInfo = { chars: number } | 'unavailable' | null;

/**
 * MOCK — reemplazar por el fetch real al backend (Cloud Run) cuando esté
 * definido el endpoint y el formato de respuesta. Devuelve siempre el mismo
 * resultado de ejemplo, solo para poder diseñar y probar esta pantalla.
 *
 * Atajo para poder ver el estado de error sin backend real: escribir
 * "error" como input dispara un fallo simulado.
 */
async function mockAnalyze(input: string): Promise<AnalysisResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  if (input.trim().toLowerCase() === 'error') {
    throw new Error('Fallo simulado para probar el estado de error');
  }

  return {
    verdict: 'dudoso',
    score: 62,
    summary:
      'El contenido combina datos verificables con afirmaciones sin fuente clara.',
    signals: [
      'El título es más alarmista que el cuerpo de la nota',
      'No se cita una fuente primaria para el dato principal',
      'El sitio no tiene historial público de correcciones',
    ],
    sources: [{ name: 'Chequeado' }, { name: 'Reuters Fact Check' }],
  };
}

/** Intenta leer el texto de la pestaña; null si la página no lo permite (chrome://, Web Store, etc.). */
async function getPageContent(tabId: number) {
  try {
    const [injection] = await browser.scripting.executeScript({
      target: { tabId },
      func: extractPageText,
    });
    return injection?.result ?? null;
  } catch {
    return null;
  }
}

function App() {
  const [auth, setAuth] = useState<AuthStatus>('loading');
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzedInput, setAnalyzedInput] = useState('');
  const [extraction, setExtraction] = useState<ExtractionInfo>(null);
  const [tabId, setTabId] = useState<number | null>(null);
  const [autoFilledUrl, setAutoFilledUrl] = useState<string | null>(null);
  const [tabUrlMissing, setTabUrlMissing] = useState(false);

  // Sesión: la leemos al abrir el popup y nos suscribimos a cambios en
  // storage — así, si el login real llega vía el background script (cuando
  // la web le mande el token a la extensión), el popup se actualiza solo.
  useEffect(() => {
    getStoredAuth().then(setAuth);

    const onChanged = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && 'auth' in changes) {
        setAuth((changes.auth.newValue as AuthState | undefined) ?? null);
      }
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  // Al abrir el popup, precargamos la URL de la pestaña activa y guardamos
  // su tabId para poder inyectar el extractor de texto más adelante.
  // "activeTab" (ver wxt.config.ts) alcanza para esto sin pedir permiso
  // sobre todas las páginas.
  useEffect(() => {
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (tab?.id != null) setTabId(tab.id);
        if (tab?.url && tab.url.startsWith('http')) {
          setInput(tab.url);
          setAutoFilledUrl(tab.url);
        } else {
          setTabUrlMissing(true);
        }
      })
      .catch(() => {
        setTabUrlMissing(true);
      });
  }, []);

  const canAnalyze = input.trim().length > 0 && status !== 'loading';

  const handleAnalyze = async () => {
    const value = input.trim();
    if (!value) return;
    setStatus('loading');
    setExtraction(null);

    // Solo intentamos leer el contenido de la página cuando el input sigue
    // siendo la URL que autocompletamos (o sea, el usuario quiere analizar
    // "esta página"). Si pegó otra URL o texto propio, no hay pestaña de la
    // que extraer nada.
    if (value === autoFilledUrl && tabId != null) {
      const page = await getPageContent(tabId);
      setExtraction(page?.text ? { chars: page.text.length } : 'unavailable');
    }

    try {
      const data = await mockAnalyze(value);
      setAnalyzedInput(value);
      setResult(data);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const handleReset = () => {
    setResult(null);
    setStatus('idle');
  };

  const handleViewFull = () => {
    // Mock: todavía no hay id de análisis real del backend, así que abre el
    // dominio placeholder. Cuando exista, armar la URL con el id acá.
    browser.tabs.create({ url: WEB_APP_URL });
  };

  const handleLogout = async () => {
    await clearStoredAuth();
    setAuth(null);
  };

  if (auth === 'loading') {
    return (
      <div className="app">
        <h1 className="app-header">
          alethe<span className="brand-ia">IA</span>
        </h1>
        <p className="hint">Cargando…</p>
      </div>
    );
  }

  if (auth === null) {
    return (
      <div className="app">
        <LoginGate onDevLogin={setAuth} />
      </div>
    );
  }

  if (status === 'done' && result) {
    return (
      <div className="app">
        <ResultView
          result={result}
          analyzedLabel={getAnalyzedLabel(analyzedInput)}
          extractionInfo={extraction}
          onReset={handleReset}
          onViewFull={handleViewFull}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-top-row">
        <h1 className="app-header">
          alethe<span className="brand-ia">IA</span>
        </h1>
        <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={14} />
        </button>
      </div>
      <p className="subtitle">Analizá esta página o pegá una URL/texto</p>

      {tabUrlMissing && status === 'idle' && (
        <p className="hint tab-hint">
          No pudimos detectar la URL de esta pestaña. Pegá una URL o texto abajo.
        </p>
      )}

      <textarea
        className="input"
        rows={4}
        placeholder="https://... o pegá el texto de la noticia"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={status === 'loading'}
      />
      <p className="hint kbd-hint">Ctrl/Cmd + Enter para analizar</p>

      <button
        className="analyze-btn"
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        aria-busy={status === 'loading'}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="spin" size={16} />
            Analizando...
          </>
        ) : status === 'error' ? (
          'Reintentar'
        ) : (
          'Analizar'
        )}
      </button>

      {status === 'error' && (
        <p className="result-error" role="alert">
          No pudimos completar el análisis. Puede ser un problema de conexión.
        </p>
      )}
    </div>
  );
}

export default App;
