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

function ResultView({
  result,
  analyzedLabel,
  extractionInfo,
  onReset,
  onViewFull,
}: ResultViewProps) {
  const { label, icon: Icon, className } = VERDICT_CONFIG[result.verdict];

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
          {result.signals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </div>

      {result.sources.length > 0 && (
        <div className="section">
          <h2 className="section-title">Fuentes consultadas</h2>
          <ul className="sources">
            {result.sources.map((source) => (
              <li key={source.name}>
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.name}
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  source.name
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="view-full-btn" onClick={onViewFull}>
        <ExternalLink size={14} />
        Ver análisis completo
      </button>

      <button className="reset-btn" onClick={onReset}>
        <RotateCcw size={14} />
        Analizar otra cosa
      </button>
    </div>
  );
}

export default ResultView;
