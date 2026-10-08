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
import type { ExtractionInfo } from './App';
import './ResultView.css';

const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  verificado: { label: 'Verificado', icon: CheckCircle2, className: 'v-verificado' },
  dudoso: { label: 'Dudoso', icon: AlertTriangle, className: 'v-dudoso' },
  falso: { label: 'Falso', icon: XCircle, className: 'v-falso' },
  'sin-datos': { label: 'Sin datos', icon: HelpCircle, className: 'v-sindatos' },
};

/** Etiqueta y nota salen del MISMO nivel: el veredicto solo aporta el color. */
const CONFIDENCE_CONFIG: Record<Confidence, { label: string; note: string }> = {
  1: { label: 'Muy baja', note: 'Una sola fuente secundaria y sin confirmación independiente.' },
  2: { label: 'Baja', note: 'Hay indicios, pero falta la fuente primaria.' },
  3: { label: 'Media', note: 'Fuente primaria localizada; queda contexto sin verificar.' },
  4: { label: 'Alta', note: 'Fuente primaria confirmada y coincidencia entre verificadores.' },
  5: {
    label: 'Muy alta',
    note: 'Fuente primaria, verificadores independientes y trazabilidad completa.',
  },
};

const STANCE_LABEL: Record<SourceStance, string> = {
  confirma: 'Confirma',
  contradice: 'Contradice',
  'sin-datos': 'Sin datos',
  origen: 'Origen',
};

const STANCE_CLASS: Record<SourceStance, string> = {
  confirma: 'v-verificado',
  contradice: 'v-falso',
  'sin-datos': 'v-sindatos',
  origen: 'v-origen',
};

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
  const { label, icon: Icon, className } = VERDICT_CONFIG[result.verdict];
  const confianza = CONFIDENCE_CONFIG[result.confidence];
  const pasos = result.reasoning.slice(0, MAX_PASOS);
  const pasosRestantes = result.reasoning.length - pasos.length;
  const fuentes = result.sources.slice(0, MAX_FUENTES);
  const fuentesRestantes = result.sources.length - fuentes.length;

  return (
    <div className="result result-enter">
      {analyzedLabel && <p className="analyzed-label">Análisis de: {analyzedLabel}</p>}
      {extractionInfo && (
        <p className="extraction-note">
          <FileText size={12} />
          {extractionInfo === 'unavailable'
            ? 'Solo se pudo usar la URL: no se leyó el contenido de la página.'
            : `Se incluyó el texto completo de la página (${extractionInfo.chars.toLocaleString('es-AR')} caracteres).`}
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
            <span className="section-title">Nivel de confianza</span>
            <span className={`confidence-label ${className}`}>{confianza.label}</span>
          </div>
          <div
            className="confidence-track"
            role="meter"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={result.confidence}
            aria-valuetext={`Confianza ${confianza.label.toLowerCase()}, ${result.confidence} de 5`}
            aria-label="Nivel de confianza del análisis"
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
            <span className="section-title">Fuentes consultadas</span>
            <ul className="sources">
              {fuentes.map((fuente, i) => {
                const contenido = (
                  <>
                    <span className="source-domain">{fuente.domain}</span>
                    <span className={`source-stance ${STANCE_CLASS[fuente.stance]}`}>
                      {STANCE_LABEL[fuente.stance]}
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
            {fuentesRestantes > 0 && (
              <p className="more-note">
                +{fuentesRestantes} fuente{fuentesRestantes === 1 ? '' : 's'} en el análisis completo
              </p>
            )}
          </div>
        )}

        {pasos.length > 0 && (
          <div className="section">
            <span className="section-title">Razonamiento</span>
            <ol className="reason-steps">
              {pasos.map((paso, i) => (
                <li key={i}>
                  <span className="reason-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="reason-text">{paso}</span>
                </li>
              ))}
            </ol>
            {pasosRestantes > 0 && (
              <p className="more-note">
                +{pasosRestantes} paso{pasosRestantes === 1 ? '' : 's'} en el análisis completo
              </p>
            )}
          </div>
        )}

        {onViewFull ? (
          <button className="analyze-btn view-full-btn" onClick={onViewFull}>
            <span className="view-full-btn-title">
              <ExternalLink size={14} />
              Ver análisis completo
            </span>
            <span className="view-full-btn-sub">Con todas las fuentes y el razonamiento entero</span>
          </button>
        ) : (
          <p className="private-note">
            <Lock size={12} />
            Este análisis salió de algo que viste en tu pantalla: queda en tu historial,
            pero no tiene página para compartir.
          </p>
        )}
      </div>

      <button className="reset-btn" onClick={onReset}>
        <RotateCcw size={14} />
        Verificar otra nota
      </button>
    </div>
  );
}

export default ResultView;
