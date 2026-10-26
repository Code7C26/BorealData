import { useState } from 'react';
import { AlertTriangle, Eye, Quote, ShieldCheck, X } from 'lucide-react';
import type { CaptureReading, Platform } from '@/lib/analysis';
import { MAX_CONTENT_CHARS, MIN_CONTENT_CHARS } from '@/lib/analysis';
import { TAG_IDIOMA, traducciones } from '@/lib/idioma';
import { useIdioma, useTextos } from './use-idioma';
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

const TEXTOS = traducciones({
  es: {
    plataforma: {
      facebook: 'Facebook',
      instagram: 'Instagram',
      x: 'X',
      whatsapp: 'WhatsApp',
      tiktok: 'TikTok',
      otro: 'Otra plataforma',
    } satisfies Record<Platform, string>,
    /** Qué tan legible quedó la imagen, en palabras del panel. */
    avisoLectura: {
      alta: null,
      media:
        'Algunas partes de la imagen quedaron difíciles de leer. Revisá el texto antes de verificar.',
      baja: 'La imagen quedó poco legible: puede faltar texto o estar mal transcripto. Si podés, cancelá y recortá más ajustado.',
    } as Record<CaptureReading['readingConfidence'], string | null>,
    eyebrow: 'Esto es lo que leímos',
    cancelar: 'Cancelar el análisis',
    bajada:
      'Corregí lo que esté mal leído antes de verificar: el veredicto se saca de este texto, no de la imagen.',
    sinAfirmacion:
      'No encontramos una afirmación verificable acá (puede ser un meme o una opinión). Podés verificar igual, pero probablemente salga sin datos.',
    textoPublicacion: 'Texto de la publicación',
    caracteres: (n: string) => `${n} caracteres`,
    minimo: (n: string) => `mínimo ${n}`,
    maximo: (n: string) => `máximo ${n}`,
    afirmacionCentral: 'Afirmación central',
    cita: 'El posteo cita:',
    verificar: 'Verificar este texto',
    privacidad: (origen: string) => `La imagen ya se descartó · origen: ${origen}`,
  },
  en: {
    plataforma: {
      facebook: 'Facebook',
      instagram: 'Instagram',
      x: 'X',
      whatsapp: 'WhatsApp',
      tiktok: 'TikTok',
      otro: 'Other platform',
    },
    avisoLectura: {
      alta: null,
      media: 'Some parts of the image were hard to read. Review the text before checking it.',
      baja: "The image wasn't very legible: text may be missing or transcribed incorrectly. If you can, cancel and crop it tighter.",
    },
    eyebrow: 'This is what we read',
    cancelar: 'Cancel the analysis',
    bajada:
      'Fix anything that was misread before checking: the verdict comes from this text, not from the image.',
    sinAfirmacion:
      "We didn't find a verifiable claim here (it may be a meme or an opinion). You can check it anyway, but it will probably come back with no data.",
    textoPublicacion: 'Post text',
    caracteres: (n: string) => `${n} characters`,
    minimo: (n: string) => `minimum ${n}`,
    maximo: (n: string) => `maximum ${n}`,
    afirmacionCentral: 'Central claim',
    cita: 'The post cites:',
    verificar: 'Check this text',
    privacidad: (origen: string) => `The image has already been discarded · source: ${origen}`,
  },
});

function ReadingReview({ reading, originLabel, onVerify, onCancel }: ReadingReviewProps) {
  const [texto, setTexto] = useState(reading.text ?? '');
  const t = useTextos(TEXTOS);
  const tag = TAG_IDIOMA[useIdioma()];

  const largo = texto.trim().length;
  const corto = largo < MIN_CONTENT_CHARS;
  const largoDeMas = largo > MAX_CONTENT_CHARS;
  const avisoLectura = t.avisoLectura[reading.readingConfidence];

  // El modelo dice si encontró algo verificable. Si no, se avisa y se deja
  // seguir igual: puede haberse equivocado, y el usuario acaba de leer la
  // transcripción con sus propios ojos.
  const sinAfirmacion = !reading.hasVerifiableClaim;

  const metadatos = [
    reading.platform ? t.plataforma[reading.platform] : null,
    reading.author,
    reading.postedAt,
  ].filter((valor): valor is string => Boolean(valor));

  return (
    <div className="review">
      <div className="review-head">
        <span className="review-eyebrow">
          <Eye size={13} />
          {t.eyebrow}
        </span>
        <button className="review-close" onClick={onCancel} aria-label={t.cancelar}>
          <X size={15} />
        </button>
      </div>

      <p className="review-hint">{t.bajada}</p>

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
          {t.sinAfirmacion}
        </p>
      )}

      <label className="review-field">
        <span className="review-label">{t.textoPublicacion}</span>
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
          {t.caracteres(largo.toLocaleString(tag))}
        </span>
        {corto && <span className="review-counter-bad">{t.minimo(String(MIN_CONTENT_CHARS))}</span>}
        {largoDeMas && (
          <span className="review-counter-bad">{t.maximo(MAX_CONTENT_CHARS.toLocaleString(tag))}</span>
        )}
      </div>

      {/* La afirmación central y la fuente citada las extrajo el modelo: se
          muestran como contexto, no se editan. Lo que se verifica es el texto. */}
      {reading.mainClaim && (
        <div className="review-claim">
          <span className="review-label">{t.afirmacionCentral}</span>
          <p className="review-claim-text">{reading.mainClaim}</p>
        </div>
      )}

      {reading.citedSource && (
        <p className="review-cited">
          <Quote size={12} />
          {t.cita} {reading.citedSource}
        </p>
      )}

      <button
        className="analyze-btn"
        onClick={() => onVerify(texto.trim())}
        disabled={corto || largoDeMas}
      >
        <ShieldCheck size={16} />
        {t.verificar}
      </button>

      <p className="review-privacy">{t.privacidad(originLabel)}</p>
    </div>
  );
}

export default ReadingReview;
