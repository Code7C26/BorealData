import { useState } from 'react';
import { AlertTriangle, Eye, Quote, ShieldCheck, X } from 'lucide-react';
import type { CaptureReading, Platform } from '@/lib/analysis';
import { MAX_CONTENT_CHARS, MIN_CONTENT_CHARS } from '@/lib/analysis';
import './ReadingReview.css';

/**
 * "Esto es lo que leímos" — el paso del medio, entre leer la imagen y
 * verificarla.
 *
 * Es el paso que más sube la calidad del veredicto, y no por la IA: si el OCR
 * leyó mal un apellido o una cifra, el usuario lo corrige ACÁ y recién
 * entonces se verifica. Sin esto, un análisis impecable sobre un texto mal
 * leído se ve exactamente igual que uno correcto.
 *
 * Es además la transparencia que es la marca del producto: mostramos lo que
 * entendimos antes de opinar sobre eso.
 */

interface ReadingReviewProps {
  reading: CaptureReading;
  /** Dominio de la página de origen, para el encabezado. */
  originLabel: string;
  onVerify: (text: string) => void;
  onCancel: () => void;
}

const ETIQUETA_PLATAFORMA: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  whatsapp: 'WhatsApp',
  tiktok: 'TikTok',
  otro: 'Otra plataforma',
};

/** Qué tan legible quedó la imagen, en palabras del panel. */
const AVISO_LECTURA: Record<CaptureReading['readingConfidence'], string | null> = {
  alta: null,
  media: 'Algunas partes de la imagen quedaron difíciles de leer. Revisá el texto antes de verificar.',
  baja: 'La imagen quedó poco legible: puede faltar texto o estar mal transcripto. Si podés, cancelá y recortá más ajustado.',
};

function ReadingReview({ reading, originLabel, onVerify, onCancel }: ReadingReviewProps) {
  const [texto, setTexto] = useState(reading.text ?? '');

  const largo = texto.trim().length;
  const corto = largo < MIN_CONTENT_CHARS;
  const largoDeMas = largo > MAX_CONTENT_CHARS;
  const avisoLectura = AVISO_LECTURA[reading.readingConfidence];

  // El modelo dice si encontró algo verificable. Si no, se avisa y se deja
  // seguir igual: puede haberse equivocado, y el usuario acaba de leer la
  // transcripción con sus propios ojos.
  const sinAfirmacion = !reading.hasVerifiableClaim;

  const metadatos = [
    reading.platform ? ETIQUETA_PLATAFORMA[reading.platform] : null,
    reading.author,
    reading.postedAt,
  ].filter((valor): valor is string => Boolean(valor));

  return (
    <div className="review">
      <div className="review-head">
        <span className="review-eyebrow">
          <Eye size={13} />
          Esto es lo que leímos
        </span>
        <button className="review-close" onClick={onCancel} aria-label="Cancelar el análisis">
          <X size={15} />
        </button>
      </div>

      <p className="review-hint">
        Corregí lo que esté mal leído antes de verificar: el veredicto se saca de
        este texto, no de la imagen.
      </p>

      {metadatos.length > 0 && (
        <div className="review-chips">
          {metadatos.map((valor) => (
            <span className="review-chip" key={valor}>
              {valor}
            </span>
          ))}
        </div>
      )}

      {avisoLectura && (
        <p className="review-warning" role="status">
          <AlertTriangle size={13} />
          {avisoLectura}
        </p>
      )}

      {sinAfirmacion && (
        <p className="review-warning" role="status">
          <AlertTriangle size={13} />
          No encontramos una afirmación verificable acá (puede ser un meme o una
          opinión). Podés verificar igual, pero probablemente salga sin datos.
        </p>
      )}

      <label className="review-field">
        <span className="review-label">Texto de la publicación</span>
        <textarea
          className="input review-textarea"
          rows={9}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          spellCheck
        />
      </label>

      <div className="review-counter">
        <span className={largoDeMas || corto ? 'review-counter-bad' : undefined}>
          {largo.toLocaleString('es-AR')} caracteres
        </span>
        {corto && <span className="review-counter-bad">mínimo {MIN_CONTENT_CHARS}</span>}
        {largoDeMas && (
          <span className="review-counter-bad">
            máximo {MAX_CONTENT_CHARS.toLocaleString('es-AR')}
          </span>
        )}
      </div>

      {/* La afirmación central y la fuente citada las extrajo el modelo: se
          muestran como contexto, no se editan. Lo que se verifica es el texto. */}
      {reading.mainClaim && (
        <div className="review-claim">
          <span className="review-label">Afirmación central</span>
          <p className="review-claim-text">{reading.mainClaim}</p>
        </div>
      )}

      {reading.citedSource && (
        <p className="review-cited">
          <Quote size={12} />
          El posteo cita: {reading.citedSource}
        </p>
      )}

      <button
        className="analyze-btn"
        onClick={() => onVerify(texto.trim())}
        disabled={corto || largoDeMas}
      >
        <ShieldCheck size={16} />
        Verificar este texto
      </button>

      <p className="review-privacy">
        La imagen ya se descartó · origen: {originLabel}
      </p>
    </div>
  );
}

export default ReadingReview;
