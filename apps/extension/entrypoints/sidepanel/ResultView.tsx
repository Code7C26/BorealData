import { AlertTriangle, CheckCircle2, ExternalLink, FileText, RotateCcw, XCircle } from 'lucide-react';
import type { AnalysisResult, Verdict } from './types';
import type { ExtractionInfo } from './App';
import './ResultView.css';

const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  confiable: {
    label: 'Confiable',
    icon: CheckCircle2,
    className: 'verdict-confiable',
  },
  dudoso: {
    label: 'Dudoso',
    icon: AlertTriangle,
    className: 'verdict-dudoso',
  },
  falso: {
    label: 'Probablemente falso',
    icon: XCircle,
    className: 'verdict-falso',
  },
};

interface ResultViewProps {
  result: AnalysisResult;
  analyzedLabel?: string;
  extractionInfo?: ExtractionInfo;
  onReset: () => void;
  onViewFull: () => void;
}

// El panel es para un vistazo rápido, no para leer el análisis entero — las
// señales de más y las fuentes citadas (con sus links) quedan solo en "Ver
// análisis completo" en la web.
const MAX_SIGNALS = 3;

function ResultView({
  result,
  analyzedLabel,
  extractionInfo,
  onReset,
  onViewFull,
}: ResultViewProps) {
  const { label, icon: Icon, className } = VERDICT_CONFIG[result.verdict];
  const signalsToShow = result.signals.slice(0, MAX_SIGNALS);
  const signalsRestantes = result.signals.length - signalsToShow.length;

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

      <div className="card">
        <div className={`verdict-badge ${className}`}>
          <Icon size={18} />
          <span>{label}</span>
        </div>

        <div className="score-row">
          <div className="score-bar">
            <div
              className={`score-fill ${className}`}
              style={{ width: `${result.score}%` }}
            />
          </div>
          <span className="score-label">{result.score}% de confianza</span>
        </div>

        <p className="summary">{result.summary}</p>

        <div className="section">
          <h2 className="section-title">Por qué este veredicto</h2>
          <ul className="signals">
            {signalsToShow.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
          {signalsRestantes > 0 && (
            <p className="signals-more">
              +{signalsRestantes} señal{signalsRestantes === 1 ? '' : 'es'} más en el análisis completo
            </p>
          )}
        </div>

        <button className="analyze-btn view-full-btn" onClick={onViewFull}>
          <span className="view-full-btn-title">
            <ExternalLink size={14} />
            Ver análisis completo
          </span>
          <span className="view-full-btn-sub">Con fuentes citadas y la explicación completa</span>
        </button>
      </div>

      <button className="reset-btn" onClick={onReset}>
        <RotateCcw size={14} />
        Analizar otra cosa
      </button>
    </div>
  );
}

export default ResultView;
