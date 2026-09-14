import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Lightbulb, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import ResultView from './ResultView';
import type { AnalysisResult } from '@/lib/analysis';
import { getAnalyzedLabel } from './utils';
import './App.css';

type Status = 'checking-auth' | 'needs-login' | 'idle' | 'loading' | 'done' | 'error';

export type ExtractionInfo = 'unavailable' | { chars: number };

const WEB_ORIGIN = import.meta.env.WXT_WEB_ORIGIN;

type GetIdTokenResponse = { idToken: string } | { error: 'NEEDS_LOGIN' };
type AnalyzeUrlResponse = { result: AnalysisResult } | { error: string };
type CacheState =
  | { status: 'done'; result: AnalysisResult }
  | { status: 'loading' }
  | { status: 'none' };

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
      <img src="/logoAletheia-mark.svg" alt="" className="app-logo" />
      <h1 className="app-header">
        Alethe<span className="brand-ia">IA</span>
      </h1>
    </div>
  );
}

async function pedirIdToken(): Promise<string | null> {
  const res = (await browser.runtime.sendMessage({ type: 'GET_ID_TOKEN' })) as GetIdTokenResponse;
  return 'idToken' in res ? res.idToken : null;
}

// El análisis real (el fetch a POST /analyze) corre en background.ts, no
// acá — así sobrevive si el panel se cierra al cambiar de pestaña a mitad
// de camino (ver el comentario "Análisis en background" en background.ts).
async function pedirAnalisis(url: string): Promise<AnalysisResult> {
  const res = (await browser.runtime.sendMessage({ type: 'ANALYZE_URL', url })) as AnalyzeUrlResponse;
  if ('error' in res) throw new Error(res.error);
  return res.result;
}

/** Le pregunta a background.ts si esta URL ya tiene resultado (o está en
 * curso) antes de mostrar la pantalla de "Analizar" — evita que reabrir el
 * panel sobre una nota ya analizada te obligue a apretar el botón de nuevo. */
async function pedirEstadoCache(url: string): Promise<CacheState> {
  return (await browser.runtime.sendMessage({ type: 'GET_CACHE_STATE', url })) as CacheState;
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

  // La URL de la pestaña activa en todo momento — la usa el listener de
  // ANALYSIS_DONE de abajo para saber si un análisis que terminó en
  // background.ts es el de la página que se está mirando ahora mismo.
  const currentUrlRef = useRef<string | null>(null);

  // Al abrir el panel, primero nos fijamos si ya hay sesión (sincronizada
  // desde la web). El status final ("idle"/"done"/"loading") lo decide el
  // efecto de abajo, una vez que chequeó el caché de la pestaña activa —
  // así evitamos el parpadeo de mostrar "Analizar" un instante para
  // enseguida saltar a un resultado que ya estaba guardado.
  useEffect(() => {
    pedirIdToken().then((token) => {
      if (token) {
        setIdToken(token);
      } else {
        setStatus('needs-login');
      }
    });
  }, []);

  // Precargamos la URL de la pestaña activa (activeTab, ver wxt.config.ts),
  // la mantenemos al día, y chequeamos contra background.ts si esa URL ya
  // se analizó (o se está analizando) para mostrar el resultado directo en
  // vez de la pantalla de "Analizar".
  useEffect(() => {
    if (!idToken) return;
    let cancelado = false;

    const sincronizarConTabActiva = (resetearResultado: boolean) => {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(async ([tab]) => {
          if (cancelado) return;

          const url = tab?.url && tab.url.startsWith('http') ? tab.url : null;
          currentUrlRef.current = url;

          if (url) {
            setInput(url);
            setTabUrlMissing(false);
          } else {
            setInput('');
            setTabUrlMissing(true);
          }

          if (!resetearResultado) return;

          if (!url) {
            setResult(null);
            setStatus('idle');
            return;
          }

          // Si esta URL ya se analizó, o se está analizando en background
          // porque el panel se cerró a mitad de camino al cambiar de
          // pestaña (ver tabs.onActivated en background.ts), no hacemos
          // esperar de nuevo: mostramos el resultado guardado o retomamos
          // el estado de carga tal cual está.
          const estado = await pedirEstadoCache(url);
          if (cancelado) return;

          if (estado.status === 'done') {
            setResult(estado.result);
            setAnalyzedInput(url);
            setStatus('done');
          } else if (estado.status === 'loading') {
            setResult(null);
            setStatus('loading');
          } else {
            setResult(null);
            setStatus('idle');
          }
        })
        .catch(() => {
          if (!cancelado) setTabUrlMissing(true);
        });
    };

    sincronizarConTabActiva(true);

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

  // Si un análisis que se disparó desde este mismo panel (u otro, antes de
  // cerrarse) termina en background.ts mientras seguimos mirando esa misma
  // URL, lo mostramos apenas llega — sin esto, "loading" quedaría esperando
  // para siempre a que alguien vuelva a preguntar.
  useEffect(() => {
    const alTerminarEnBackground = (message: {
      type?: string;
      url?: string;
      result?: AnalysisResult;
    }) => {
      if (
        message?.type === 'ANALYSIS_DONE' &&
        message.url === currentUrlRef.current &&
        statusRef.current === 'loading' &&
        message.result
      ) {
        setResult(message.result);
        setAnalyzedInput(message.url);
        setStatus('done');
      }
    };
    browser.runtime.onMessage.addListener(alTerminarEnBackground);
    return () => browser.runtime.onMessage.removeListener(alTerminarEnBackground);
  }, []);

  const canAnalyze = input.trim().length > 0 && status !== 'loading';

  const handleAnalyze = async () => {
    const value = input.trim();
    if (!value || !idToken) return;
    setStatus('loading');
    try {
      const data = await pedirAnalisis(value);
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
  // completo" no necesita mandar los datos: abre la página pública del análisis
  // por id (/resultado/:id, servida por GET /analyses/:id), que además se ve sin
  // sesión. Si el guardado falló no hay id, y ahí sí se cae al historial.
  // La pestaña nueva pasa a estar activa, y de cerrar el panel se encarga el
  // listener de tabs.onActivated en entrypoints/background.ts.
  const handleViewFull = () => {
    const url = result?.id ? `${WEB_ORIGIN}/resultado/${result.id}` : `${WEB_ORIGIN}/historial`;
    browser.tabs.create({ url });
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
            <b>Buscamos la fuente primaria</b> que la nota cita y la contrastamos con verificadores independientes.
          </p>
        </div>
        <div className="step">
          <span className="step-num">3</span>
          <p className="step-text">
            <b>Te devolvemos el veredicto</b> con el nivel de confianza, las fuentes y su postura, y los pasos del razonamiento.
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
