import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Camera, Lightbulb, Loader2, LogIn, ScanText, ShieldCheck } from 'lucide-react';
import ResultView from './ResultView';
import CropPreview from './CropPreview';
import ReadingReview from './ReadingReview';
import type { AnalysisResult, ContentJob } from '@/lib/analysis';
import type { CropRect } from '@/lib/capture';
import { patronDePermiso } from '@/lib/platform';
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
type StartCaptureResponse = { ok: true } | { error: string };

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

/**
 * Flujo de contenido (captura / imagen / selección)
 * --------------------------------------------------
 * Todo el estado vive en background.ts (ver "Análisis de contenido" allá) y
 * este panel solo lo renderiza. No es por prolijidad: el panel se cierra solo
 * al cambiar de pestaña, y un flujo de tres pasos (captura → lectura →
 * verificación) guardado acá se perdería a mitad de camino. Así, al reabrirlo,
 * GET_CONTENT_JOB devuelve el job tal como está y retoma la pantalla justa.
 */
async function pedirJob(): Promise<ContentJob | null> {
  return (await browser.runtime.sendMessage({ type: 'GET_CONTENT_JOB' })) as ContentJob | null;
}

/**
 * Para capturar hace falta permiso de host sobre esa pestaña. Los dominios
 * sociales ya lo tienen declarado (wxt.config.ts); para el resto se pide en el
 * momento, y por eso esto se resuelve ANTES del clic: `permissions.request()`
 * exige un gesto del usuario, y cualquier await previo dentro del handler lo
 * pierde. El panel precalcula el patrón y si ya está concedido (ver el efecto
 * que sincroniza con la pestaña activa).
 */
async function tienePermisoDeCaptura(patron: string | null): Promise<boolean> {
  if (!patron) return false;
  try {
    return await browser.permissions.contains({ origins: [patron] });
  } catch {
    return false;
  }
}

/** Pantalla de espera de los dos pasos de red del flujo de contenido. */
function PantallaCargando({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="card job-loading">
      <Loader2 className="spin" size={22} />
      <p className="job-loading-title">{titulo}</p>
      <p className="job-loading-detail">{detalle}</p>
    </div>
  );
}

function App() {
  const [status, setStatus] = useState<Status>('checking-auth');
  const [idToken, setIdToken] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzedInput, setAnalyzedInput] = useState('');
  const [tabUrlMissing, setTabUrlMissing] = useState(false);

  // Flujo de contenido. `job` es el espejo de lo que tiene background.ts.
  const [job, setJob] = useState<ContentJob | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  // Precalculados contra la pestaña activa para que el clic de "Analizar lo
  // que estás viendo" no tenga que esperar nada antes de pedir el permiso.
  const [patronPermiso, setPatronPermiso] = useState<string | null>(null);
  const [permisoConcedido, setPermisoConcedido] = useState(false);

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

          // El permiso de captura se resuelve acá, fuera del clic (ver
          // tienePermisoDeCaptura): después ya es tarde para pedirlo.
          const patron = patronDePermiso(tab?.url);
          setPatronPermiso(patron);
          setPermisoConcedido(await tienePermisoDeCaptura(patron));

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

  // Al abrir el panel puede haber un flujo de contenido ya empezado desde el
  // menú contextual (o uno que quedó a mitad de camino porque el panel se
  // cerró al cambiar de pestaña): se retoma donde estaba.
  useEffect(() => {
    pedirJob()
      .then((actual) => {
        if (actual) setJob(actual);
      })
      .catch(() => {});

    const alCambiarElJob = (message: { type?: string; job?: ContentJob | null }) => {
      if (message?.type === 'CONTENT_JOB') setJob(message.job ?? null);
    };
    browser.runtime.onMessage.addListener(alCambiarElJob);
    return () => browser.runtime.onMessage.removeListener(alCambiarElJob);
  }, []);

  const iniciarCaptura = () => {
    setCaptureError(null);
    browser.runtime
      .sendMessage({ type: 'START_CAPTURE' })
      .then((res: StartCaptureResponse) => {
        if (res && 'error' in res) setCaptureError(res.error);
      })
      .catch(() => setCaptureError('No pudimos capturar esta pantalla.'));
  };

  /**
   * OJO con el orden: si falta el permiso, `permissions.request()` tiene que
   * ser la PRIMERA cosa que corra en el handler. Un await antes (una query de
   * pestañas, por ejemplo) consume el gesto del usuario y Chrome rechaza el
   * pedido sin mostrar el diálogo.
   */
  const handleCapture = () => {
    if (permisoConcedido || !patronPermiso) {
      iniciarCaptura();
      return;
    }
    browser.permissions
      .request({ origins: [patronPermiso] })
      .then((concedido) => {
        if (!concedido) {
          setCaptureError('Sin permiso sobre esta página no podemos leer lo que estás viendo.');
          return;
        }
        setPermisoConcedido(true);
        iniciarCaptura();
      })
      .catch((err: unknown) => {
        // El motivo importa y hay que mostrarlo: el caso más probable es que
        // Chrome tenga cargado un manifest viejo (la extensión no se recargó
        // después de que cambiaran los permisos), y ahí rechaza el pedido
        // porque todavía no conoce `optional_host_permissions`. Sin el texto
        // real del error, eso se ve igual que "el usuario dijo que no".
        const motivo = err instanceof Error ? ` (${err.message})` : '';
        setCaptureError(
          `No pudimos pedir permiso para capturar esta página.${motivo} Si acabás de actualizar la extensión, recargala en chrome://extensions.`,
        );
      });
  };

  const confirmarRecorte = (crop: CropRect) => {
    browser.runtime.sendMessage({ type: 'READ_JOB', crop }).catch(() => {});
  };

  const verificarLectura = (text: string) => {
    browser.runtime.sendMessage({ type: 'VERIFY_JOB', text }).catch(() => {});
  };

  const cancelarJob = () => {
    setJob(null);
    browser.runtime.sendMessage({ type: 'CANCEL_JOB' }).catch(() => {});
  };

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

  /** Lo mismo para un resultado del flujo de contenido (ver la rama de `job`). */
  const handleViewFullJob = () => {
    const id = job?.result?.id;
    browser.tabs.create({ url: id ? `${WEB_ORIGIN}/resultado/${id}` : `${WEB_ORIGIN}/historial` });
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

  // El flujo de contenido manda sobre el de URL: si hay un job, es lo que el
  // usuario está haciendo ahora mismo.
  if (job) {
    const etiquetaOrigen =
      job.kind === 'selection'
        ? `selección en ${job.originLabel}`
        : `captura de ${job.originLabel}`;

    if (job.status === 'cropping' && job.captureDataUrl) {
      return (
        <div className="app">
          <Blobs />
          <CropPreview
            dataUrl={job.captureDataUrl}
            originLabel={job.originLabel}
            onConfirm={confirmarRecorte}
            onCancel={cancelarJob}
          />
        </div>
      );
    }

    if (job.status === 'reading') {
      return (
        <div className="app">
          <Blobs />
          <Brand />
          <PantallaCargando
            titulo="Leyendo la imagen"
            detalle="Transcribimos lo que dice la publicación. Todavía no hay veredicto: primero lo vas a poder revisar."
          />
        </div>
      );
    }

    if (job.status === 'review' && job.reading) {
      return (
        <div className="app">
          <Blobs />
          <ReadingReview
            reading={job.reading}
            originLabel={job.originLabel}
            onVerify={verificarLectura}
            onCancel={cancelarJob}
          />
        </div>
      );
    }

    if (job.status === 'analyzing') {
      return (
        <div className="app">
          <Blobs />
          <Brand />
          <PantallaCargando
            titulo="Verificando"
            detalle="Buscamos la fuente primaria y la cruzamos con verificadores independientes."
          />
        </div>
      );
    }

    if (job.status === 'done' && job.result) {
      return (
        <div className="app">
          <Blobs />
          <ResultView
            result={job.result}
            analyzedLabel={etiquetaOrigen}
            onReset={cancelarJob}
            // Sin onViewFull no se dibuja el botón: un análisis de contenido
            // privado no tiene página pública en /resultado/:id aunque tenga
            // id (ver AnalysisResult.shareable).
            onViewFull={job.result.shareable ? handleViewFullJob : undefined}
          />
        </div>
      );
    }

    if (job.status === 'error') {
      return (
        <div className="app">
          <Blobs />
          <Brand />
          <div className="card">
            <p className="result-error">{job.error ?? 'No pudimos completar el análisis.'}</p>
            {job.errorCode === 'NEEDS_LOGIN' ? (
              <button className="analyze-btn" onClick={handleLogin}>
                <LogIn size={16} />
                Iniciar sesión
              </button>
            ) : (
              <button className="analyze-btn" onClick={cancelarJob}>
                Volver
              </button>
            )}
          </div>
        </div>
      );
    }
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

        {/* La segunda puerta de entrada. Es el camino para todo lo que la URL
            no alcanza a describir: un posteo de Facebook, una historia de
            Instagram, una cadena de WhatsApp. El servidor no puede verlas
            (solo vería el muro de login), pero esta pantalla sí. */}
        <div className="capture-divider">
          <span>o</span>
        </div>

        <button className="capture-btn" onClick={handleCapture}>
          <span className="capture-btn-title">
            <Camera size={15} />
            Analizar lo que estás viendo
          </span>
          <span className="capture-btn-sub">
            Para posteos privados o historias, que no se pueden leer por su enlace
          </span>
        </button>

        {captureError && (
          <p className="result-error capture-error" role="alert">
            {captureError}
          </p>
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
