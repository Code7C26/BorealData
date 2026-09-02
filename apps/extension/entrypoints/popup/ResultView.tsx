import { AlertTriangle, CheckCircle2, ExternalLink, RotateCcw, XCircle } from 'lucide-react';
import type { AnalysisResult, Verdict } from './types';
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
  onReset: () => void;
}

function ResultView({ result, analyzedLabel, onReset }: ResultViewProps) {
  const { label, icon: Icon, className } = VERDICT_CONFIG[result.verdict];

  return (
    <div className="result">
      {analyzedLabel && <p className="analyzed-label">Análisis de: {analyzedLabel}</p>}
      <div className={`verdict-badge ${className}`}>
        <Icon size={18} />
        <span>{label}</span>
      </div>

      <div className="score-row">
        <div className="score-bar">
          <div className="score-fill" style={{ width: `${result.score}%` }} />
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

      <button className="reset-btn" onClick={onReset}>
        <RotateCcw size={14} />
        Analizar otra cosa
      </button>
    </div>
  );
}

export default ResultView;
