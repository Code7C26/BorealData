import { useEffect, useState, type KeyboardEvent } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import ResultView from './ResultView';
import type { AnalysisResult, BackendAnalyzeResponse } from './types';
import { getAnalyzedLabel, mapBackendResult } from './utils';
import './App.css';

type Status = 'checking-auth' | 'needs-login' | 'idle' | 'loading' | 'done' | 'error';

const API_URL = import.meta.env.WXT_API_URL;
const WEB_ORIGIN = import.meta.env.WXT_WEB_ORIGIN;

type GetIdTokenResponse = { idToken: string } | { error: 'NEEDS_LOGIN' };

async function pedirIdToken(): Promise<string | null> {
  const res = (await browser.runtime.sendMessage({ type: 'GET_ID_TOKEN' })) as GetIdTokenResponse;
  return 'idToken' in res ? res.idToken : null;
}

async function analizar(idToken: string, url: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ url }),
  });

  if (res.status === 401) {
    // Sesión inválida/vencida más allá de lo que el background pudo
    // refrescar — la limpiamos para que la próxima vez pida login de nuevo.
    await browser.runtime.sendMessage({
      type: 'ALETHEIA_AUTH_SYNC',
      payload: { source: 'aletheia-web', type: 'AUTH_LOGOUT' },
    });
    throw new Error('NEEDS_LOGIN');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? `Error ${res.status}`);
  }

  return mapBackendResult(data as BackendAnalyzeResponse);
}

function App() {
  const [status, setStatus] = useState<Status>('checking-auth');
  const [idToken, setIdToken] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzedInput, setAnalyzedInput] = useState('');
  const [tabUrlMissing, setTabUrlMissing] = useState(false);

  // Al abrir el popup, primero nos fijamos si ya hay sesión (sincronizada
  // desde la web) antes de mostrar cualquier otra cosa.
  useEffect(() => {
    pedirIdToken().then((token) => {
      if (token) {
        setIdToken(token);
        setStatus('idle');
      } else {
        setStatus('needs-login');
      }
    });
  }, []);

  // Precargamos la URL de la pestaña activa (activeTab, ver wxt.config.ts).
  useEffect(() => {
    if (status !== 'idle') return;
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
  }, [status]);

  const canAnalyze = input.trim().length > 0 && status !== 'loading';

  const handleAnalyze = async () => {
    const value = input.trim();
    if (!value || !idToken) return;
    setStatus('loading');
    try {
      const data = await analizar(idToken, value);
      setAnalyzedInput(value);
      setResult(data);
      setStatus('done');
    } catch (err) {
      if (err instanceof Error && err.message === 'NEEDS_LOGIN') {
        setIdToken(null);
        setStatus('needs-login');
        return;
      }
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

  const handleLogin = () => {
    browser.tabs.create({ url: `${WEB_ORIGIN}/login` });
  };

  if (status === 'checking-auth') {
    return (
      <div className="app">
        <Loader2 className="spin" size={20} />
      </div>
    );
  }

  if (status === 'needs-login') {
    return (
      <div className="app">
        <h1 className="app-header">
          alethe<span className="brand-ia">IA</span>
        </h1>
        <p className="subtitle">Iniciá sesión para analizar noticias.</p>
        <button className="analyze-btn" onClick={handleLogin}>
          <LogIn size={16} />
          Iniciar sesión
        </button>
      </div>
    );
  }

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
        <p className="hint">
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
        ) : (
          'Analizar'
        )}
      </button>

      {status === 'error' && (
        <div className="error-box" role="alert">
          <p className="result-error">
            No pudimos completar el análisis. Puede ser un problema de conexión.
          </p>
          <button className="retry-btn" onClick={handleAnalyze}>
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
