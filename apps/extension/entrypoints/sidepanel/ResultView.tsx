import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  HelpCircle,
  Lock,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import type { AnalysisResult, Confidence, SourceStance, Verdict } from '@/lib/analysis';
import { TAG_IDIOMA, traducciones } from '@/lib/idioma';
import type { ExtractionInfo } from './App';
import { useIdioma, useTextos } from './use-idioma';
import './ResultView.css';

/** Ícono y color por veredicto. Las palabras van aparte, en TEXTOS. */
const VERDICT_ESTILO: Record<Verdict, { icon: typeof CheckCircle2; className: string }> = {
  verificado: { icon: CheckCircle2, className: 'v-verificado' },
  dudoso: { icon: AlertTriangle, className: 'v-dudoso' },
  falso: { icon: XCircle, className: 'v-falso' },
  'sin-datos': { icon: HelpCircle, className: 'v-sindatos' },
};

const STANCE_CLASS: Record<SourceStance, string> = {
  confirma: 'v-verificado',
  contradice: 'v-falso',
  'sin-datos': 'v-sindatos',
  origen: 'v-origen',
};

/**
 * El mismo vocabulario que la web (apps/lib/verdict.ts), en los dos idiomas. Etiqueta y
 * nota de confianza salen del MISMO nivel: el veredicto solo aporta el color.
 */
const TEXTOS = traducciones({
  es: {
    veredicto: {
      verificado: 'Verificado',
      dudoso: 'Dudoso',
      falso: 'Falso',
      'sin-datos': 'Sin datos',
    } satisfies Record<Verdict, string>,
    confianza: {
      1: { label: 'Muy baja', note: 'Una sola fuente secundaria y sin confirmación independiente.' },
      2: { label: 'Baja', note: 'Hay indicios, pero falta la fuente primaria.' },
      3: { label: 'Media', note: 'Fuente primaria localizada; queda contexto sin verificar.' },
      4: { label: 'Alta', note: 'Fuente primaria confirmada y coincidencia entre verificadores.' },
      5: {
        label: 'Muy alta',
        note: 'Fuente primaria, verificadores independientes y trazabilidad completa.',
      },
    } satisfies Record<Confidence, { label: string; note: string }>,
    postura: {
      confirma: 'Confirma',
      contradice: 'Contradice',
      'sin-datos': 'Sin datos',
      origen: 'Origen',
    } satisfies Record<SourceStance, string>,
    analisisDe: (etiqueta: string) => `Análisis de: ${etiqueta}`,
    soloUrl: 'Solo se pudo usar la URL: no se leyó el contenido de la página.',
    textoCompleto: (chars: string) =>
      `Se incluyó el texto completo de la página (${chars} caracteres).`,
    nivelConfianza: 'Nivel de confianza',
    valorConfianza: (nivel: string, n: number) => `Confianza ${nivel}, ${n} de 5`,
    etiquetaConfianza: 'Nivel de confianza del análisis',
    fuentes: 'Fuentes consultadas',
    fuentesDeMas: (n: number) => `+${n} fuente${n === 1 ? '' : 's'} en el análisis completo`,
    razonamiento: 'Razonamiento',
    pasosDeMas: (n: number) => `+${n} paso${n === 1 ? '' : 's'} en el análisis completo`,
    verCompleto: 'Ver análisis completo',
    verCompletoSub: 'Con todas las fuentes y el razonamiento entero',
    privado:
      'Este análisis salió de algo que viste en tu pantalla: queda en tu historial, pero no tiene página para compartir.',
    otraNota: 'Verificar otra nota',
  },
  en: {
    veredicto: {
      verificado: 'Verified',
      dudoso: 'Questionable',
      falso: 'False',
      'sin-datos': 'No data',
    },
    confianza: {
      1: { label: 'Very low', note: 'A single secondary source, with no independent confirmation.' },
      2: { label: 'Low', note: 'There are signs, but the primary source is missing.' },
      3: { label: 'Medium', note: 'Primary source located; some context remains unverified.' },
      4: { label: 'High', note: 'Primary source confirmed and fact-checkers agree.' },
      5: {
        label: 'Very high',
        note: 'Primary source, independent fact-checkers and full traceability.',
      },
    },
    postura: {
      confirma: 'Confirms',
      contradice: 'Contradicts',
      'sin-datos': 'No data',
      origen: 'Origin',
    },
    analisisDe: (etiqueta: string) => `Analysis of: ${etiqueta}`,
    soloUrl: "Only the URL could be used: the page's content wasn't read.",
    textoCompleto: (chars: string) => `The page's full text was included (${chars} characters).`,
    nivelConfianza: 'Confidence level',
    valorConfianza: (nivel: string, n: number) => `${nivel} confidence, ${n} out of 5`,
    etiquetaConfianza: 'Confidence level of the analysis',
    fuentes: 'Sources checked',
    fuentesDeMas: (n: number) => `+${n} more source${n === 1 ? '' : 's'} in the full analysis`,
    razonamiento: 'Reasoning',
    pasosDeMas: (n: number) => `+${n} more step${n === 1 ? '' : 's'} in the full analysis`,
    verCompleto: 'See full analysis',
    verCompletoSub: 'With every source and the complete reasoning',
    privado:
      "This analysis came from something you saw on your screen: it stays in your history, but it doesn't have a page to share.",
    otraNota: 'Check another article',
  },
});

interface ResultViewProps {
  result: AnalysisResult;
  analyzedLabel?: string;
  extractionInfo?: ExtractionInfo;
  onReset: () => void;
  /**
   * Sin esto no se dibuja "Ver análisis completo". Es el caso del contenido
   * que manda el cliente (una captura, una selección): se guarda y tiene id,
   * pero NO tiene página pública en /resultado/:id, porque el análisis de un
   * posteo privado no se le sirve a nadie más (ver AnalysisResult.shareable).
   */
  onViewFull?: () => void;
}

// El panel es para un vistazo rápido, no para leer el análisis entero: los
// pasos de razonamiento de más y el detalle quedan en "Ver análisis completo".
const MAX_PASOS = 3;
const MAX_FUENTES = 4;

function ResultView({
  result,
  analyzedLabel,
  extractionInfo,
  onReset,
  onViewFull,
}: ResultViewProps) {
  const t = useTextos(TEXTOS);
  const tag = TAG_IDIOMA[useIdioma()];
  const { icon: Icon, className } = VERDICT_ESTILO[result.verdict];
  const label = t.veredicto[result.verdict];
  const confianza = t.confianza[result.confidence];
  const pasos = result.reasoning.slice(0, MAX_PASOS);
  const pasosRestantes = result.reasoning.length - pasos.length;
  const fuentes = result.sources.slice(0, MAX_FUENTES);
  const fuentesRestantes = result.sources.length - fuentes.length;

  return (
    <div className="result result-enter">
      {analyzedLabel && <p className="analyzed-label">{t.analisisDe(analyzedLabel)}</p>}
      {extractionInfo && (
        <p className="extraction-note">
          <FileText size={12} />
          {extractionInfo === 'unavailable'
            ? t.soloUrl
            : t.textoCompleto(extractionInfo.chars.toLocaleString(tag))}
        </p>
      )}

      {/* El borde superior lleva el color del veredicto, igual que la card de la web. */}
      <div className={`card card-verdict ${className}`}>
        <div className={`verdict-chip ${className}`}>
          <Icon size={14} strokeWidth={2.25} />
          <span>{label}</span>
        </div>

        {/* El titular es una frase en lenguaje natural, nunca la etiqueta. */}
        <h2 className="verdict-headline">{result.headline}</h2>
        {result.lead && <p className="verdict-lead">{result.lead}</p>}

        {/* Cinco segmentos, no un porcentaje: orden de magnitud sin fingir
            precisión decimal. */}
        <div className="confidence">
          <div className="confidence-head">
            <span className="section-title">{t.nivelConfianza}</span>
            <span className={`confidence-label ${className}`}>{confianza.label}</span>
          </div>
          <div
            className="confidence-track"
            role="meter"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={result.confidence}
            aria-valuetext={t.valorConfianza(confianza.label.toLowerCase(), result.confidence)}
            aria-label={t.etiquetaConfianza}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={`confidence-seg ${i <= result.confidence ? className : 'seg-off'}`}
              />
            ))}
          </div>
          <p className="confidence-note">{confianza.note}</p>
        </div>

        {fuentes.length > 0 && (
          <div className="section">
            <span className="section-title">{t.fuentes}</span>
            <ul className="sources">
              {fuentes.map((fuente, i) => {
                const contenido = (
                  <>
                    <span className="source-domain">{fuente.domain}</span>
                    <span className={`source-stance ${STANCE_CLASS[fuente.stance]}`}>
                      {t.postura[fuente.stance]}
                    </span>
                  </>
                );
                return (
                  <li key={`${fuente.domain}-${i}`} title={fuente.note}>
                    {fuente.url ? (
                      <a
                        className="source-row"
                        href={fuente.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {contenido}
                      </a>
                    ) : (
                      <span className="source-row">{contenido}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {fuentesRestantes > 0 && <p className="more-note">{t.fuentesDeMas(fuentesRestantes)}</p>}
          </div>
        )}

        {pasos.length > 0 && (
          <div className="section">
            <span className="section-title">{t.razonamiento}</span>
            <ol className="reason-steps">
              {pasos.map((paso, i) => (
                <li key={i}>
                  <span className="reason-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="reason-text">{paso}</span>
                </li>
              ))}
            </ol>
            {pasosRestantes > 0 && <p className="more-note">{t.pasosDeMas(pasosRestantes)}</p>}
          </div>
        )}

        {onViewFull ? (
          <button className="analyze-btn view-full-btn" onClick={onViewFull}>
            <span className="view-full-btn-title">
              <ExternalLink size={14} />
              {t.verCompleto}
            </span>
            <span className="view-full-btn-sub">{t.verCompletoSub}</span>
          </button>
        ) : (
          <p className="private-note">
            <Lock size={12} />
            {t.privado}
          </p>
        )}
      </div>

      <button className="reset-btn" onClick={onReset}>
        <RotateCcw size={14} />
        {t.otraNota}
      </button>
    </div>
  );
}

export default ResultView;
