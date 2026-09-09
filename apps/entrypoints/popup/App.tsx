import { useEffect, useState, type KeyboardEvent } from 'react';
import { Loader2 } from 'lucide-react';
import ResultView from './ResultView';
import type { AnalysisResult } from './types';
import { getAnalyzedLabel } from './utils';
import './App.css';

type Status = 'idle' | 'loading' | 'done' | 'error';

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

function App() {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzedInput, setAnalyzedInput] = useState('');
  const [tabUrlMissing, setTabUrlMissing] = useState(false);

  // Al abrir el popup, precargamos la URL de la pestaña activa.
  // "activeTab" (ver wxt.config.ts) alcanza para leer esta URL sin pedir
  // permiso sobre todas las páginas.
  useEffect(() => {
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (tab?.url && tab.url.startsWith('http')) {
          setInput(tab.url);
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

  if (status === 'done' && result) {
    return (
      <div className="app">
        <ResultView
          result={result}
          analyzedLabel={getAnalyzedLabel(analyzedInput)}
          onReset={handleReset}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <h1 className="app-header">
        alethe<span className="brand-ia">IA</span>
      </h1>
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
