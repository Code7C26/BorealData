import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Lightbulb, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import ResultView from './ResultView';
import type { AnalysisResult, BackendAnalyzeResponse } from './types';
import { getAnalyzedLabel, mapBackendResult } from './utils';
import './App.css';

type Status = 'checking-auth' | 'needs-login' | 'idle' | 'loading' | 'done' | 'error';

export type ExtractionInfo = 'unavailable' | { chars: number };

const API_URL = import.meta.env.WXT_API_URL;
const WEB_ORIGIN = import.meta.env.WXT_WEB_ORIGIN;

type GetIdTokenResponse = { idToken: string } | { error: 'NEEDS_LOGIN' };

// Mismo ambiente animado que la web (ver global.css: .glow-blob + .animate-float) —
// se mantiene en todas las pantallas para que el panel no se sienta como un popup plano.
function Blobs() {
  return (
    <>
      <div aria-hidden="true" className="glow-blob blob-a" />
      <div aria-hidden="true" className="glow-blob blob-b" />
      <div aria-hidden="true" className="glow-blob blob-c" />
    </>
  );
}

function Brand() {
  return (
    <div className="app-brand">
      <img src="/logoAletheia.png" alt="" className="app-logo" />
      <h1 className="app-header">
        alethe<span className="brand-ia">IA</span>
      </h1>
    </div>
  );
}

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

  // El side panel, a diferencia del popup viejo, no se cierra al cambiar de
  // pestaña — los listeners de abajo necesitan el status actual pero no
  // queremos re-suscribirlos en cada cambio de estado.
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Al abrir el panel, primero nos fijamos si ya hay sesión (sincronizada
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

  // Precargamos la URL de la pestaña activa (activeTab, ver wxt.config.ts) y
  // la mantenemos al día: como el panel queda anclado a la ventana y no a la
  // pestaña, cambiar de pestaña (o navegar dentro de la misma) antes no
  // actualizaba nada y quedaba mostrando el link de la página anterior.
  useEffect(() => {
    if (!idToken) return;
    let cancelado = false;

    const sincronizarConTabActiva = (resetearResultado: boolean) => {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(([tab]) => {
          if (cancelado) return;
          if (tab?.url && tab.url.startsWith('http')) {
            setInput(tab.url);
            setTabUrlMissing(false);
          } else {
            setInput('');
            setTabUrlMissing(true);
          }
          if (resetearResultado) {
            setResult(null);
            setStatus('idle');
          }
        })
        .catch(() => {
          if (!cancelado) setTabUrlMissing(true);
        });
    };

    sincronizarConTabActiva(false);

    // No interrumpimos un análisis en curso: si el usuario cambia de pestaña
    // mientras está "loading", el resultado se ignora al terminar en vez de
    // resetear el estado a mitad de camino.
    const alCambiarDeTab = () => {
      if (statusRef.current !== 'loading') sincronizarConTabActiva(true);
    };
    const alNavegarEnTabActiva = (
      _tabId: number,
      changeInfo: { url?: string },
      tab: { active?: boolean },
    ) => {
      if (tab.active && changeInfo.url && statusRef.current !== 'loading') {
        sincronizarConTabActiva(true);
      }
    };

    browser.tabs.onActivated.addListener(alCambiarDeTab);
    browser.tabs.onUpdated.addListener(alNavegarEnTabActiva);
    return () => {
      cancelado = true;
      browser.tabs.onActivated.removeListener(alCambiarDeTab);
      browser.tabs.onUpdated.removeListener(alNavegarEnTabActiva);
    };
  }, [idToken]);

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

  // El análisis ya se guardó en el backend (ver POST /analyze), así que "ver
  // completo" no necesita mandar los datos: el historial de la web ya lo
  // tiene como el más reciente. No hay todavía un endpoint de detalle por id
  // ni una ruta /resultado/:id — si se agrega, este link puede apuntar directo ahí.
  // La pestaña nueva pasa a estar activa, y de cerrar el panel se encarga el
  // listener de tabs.onActivated en entrypoints/background.ts.
  const handleViewFull = () => {
    browser.tabs.create({ url: `${WEB_ORIGIN}/historial` });
  };

  if (status === 'checking-auth') {
    return (
      <div className="app">
        <Blobs />
        <div className="app-loading">
          <Loader2 className="spin" size={22} />
        </div>
      </div>
    );
  }

  if (status === 'needs-login') {
    return (
      <div className="app">
        <Blobs />
        <Brand />
        <span className="eyebrow-badge">
          <ShieldCheck size={13} />
          Acceso seguro
        </span>
        <div className="card">
          <p className="subtitle" style={{ marginBottom: 14 }}>
            Iniciá sesión para analizar noticias desde cualquier página.
          </p>
          <button className="analyze-btn" onClick={handleLogin}>
            <LogIn size={16} />
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  if (status === 'done' && result) {
    return (
      <div className="app">
        <Blobs />
        <ResultView
          result={result}
          analyzedLabel={getAnalyzedLabel(analyzedInput)}
          onReset={handleReset}
          onViewFull={handleViewFull}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <Blobs />
      <Brand />
      <p className="subtitle">Analizá esta página o pegá una URL/texto</p>

      <div className="card">
        {tabUrlMissing && status === 'idle' && (
          <p className="hint" style={{ marginBottom: 10 }}>
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

      <p className="steps-title">Cómo funciona</p>
      <div className="steps">
        <div className="step">
          <span className="step-num">1</span>
          <p className="step-text">
            <b>Extraemos el contenido</b> de la página que estás mirando (o el texto que pegues).
          </p>
        </div>
        <div className="step">
          <span className="step-num">2</span>
          <p className="step-text">
            <b>Cruzamos fuentes</b> con IA para contrastar los datos contra medios independientes.
          </p>
        </div>
        <div className="step">
          <span className="step-num">3</span>
          <p className="step-text">
            <b>Te devolvemos un veredicto</b> con el porcentaje de confianza y las señales que lo explican.
          </p>
        </div>
      </div>

      <div className="tip-card">
        <div className="tip-icon">
          <Lightbulb size={14} />
        </div>
        <div>
          <p className="tip-title">Tip</p>
          <p className="tip-text">
            Si solo una fuente reporta una noticia y ningún medio independiente la confirma,
            tomala con cautela antes de compartirla.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
