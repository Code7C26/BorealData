'use client'

import { useState } from 'react'
import { AlertTriangle, Eye, Quote, ShieldCheck, X } from 'lucide-react'
import {
  MAX_CONTENT_CHARS,
  MIN_CONTENT_CHARS,
  type CaptureReading,
  type Platform,
} from '@/lib/api'
import { TAG_IDIOMA, traducciones } from '@/lib/idioma'
import { useIdioma, useTextos } from '@/lib/use-idioma'
import { cn } from '@/lib/utils'

/**
 * "Esto es lo que leímos" — el paso del medio, entre leer la imagen y
 * verificarla.
 *
 * Es el paso que más sube la calidad del veredicto, y no por la IA: si el OCR
 * leyó mal un apellido o una cifra, se corrige acá y recién entonces se
 * verifica. Sin esto, un análisis impecable sobre un texto mal leído se ve
 * exactamente igual que uno correcto.
 *
 * Gemelo de apps/extension/entrypoints/sidepanel/ReadingReview.tsx.
 */

interface LecturaRevisionProps {
  lectura: CaptureReading
  onVerificar: (texto: string) => void
  onCancelar: () => void
  className?: string
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
    /** Qué tan legible quedó la imagen, en palabras de la pantalla. */
    avisoLectura: {
      alta: null,
      media:
        'Algunas partes de la imagen quedaron difíciles de leer. Revisá el texto antes de verificar.',
      baja: 'La imagen quedó poco legible: puede faltar texto o estar mal transcripto. Si podés, volvé atrás y recortá más ajustado.',
    } as Record<CaptureReading['readingConfidence'], string | null>,
    eyebrow: 'Esto es lo que leímos',
    titulo: 'Revisalo antes de verificar',
    descartar: 'Descartar esta lectura',
    bajada: 'Corregí lo que esté mal leído: el veredicto se saca de este texto, no de la imagen.',
    sinAfirmacion:
      'No encontramos una afirmación verificable acá (puede ser un meme o una opinión). Podés verificar igual, pero probablemente salga sin datos.',
    textoPublicacion: 'Texto de la publicación',
    textoTranscripto: 'Texto transcripto de la publicación',
    caracteres: (n: string) => `${n} caracteres`,
    minimo: (n: string) => `mínimo ${n}`,
    maximo: (n: string) => `máximo ${n}`,
    afirmacionCentral: 'Afirmación central',
    cita: 'El posteo cita:',
    verificar: 'Verificar este texto',
    privacidad: 'La imagen ya se descartó: no sale de tu navegador más que para leerla',
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
      baja: "The image wasn't very legible: text may be missing or transcribed incorrectly. If you can, go back and crop it tighter.",
    },
    eyebrow: 'This is what we read',
    titulo: 'Review it before checking',
    descartar: 'Discard this reading',
    bajada: 'Fix anything that was misread: the verdict comes from this text, not from the image.',
    sinAfirmacion:
      "We didn't find a verifiable claim here (it may be a meme or an opinion). You can check it anyway, but it will probably come back with not enough data.",
    textoPublicacion: 'Post text',
    textoTranscripto: 'Transcribed text of the post',
    caracteres: (n: string) => `${n} characters`,
    minimo: (n: string) => `minimum ${n}`,
    maximo: (n: string) => `maximum ${n}`,
    afirmacionCentral: 'Central claim',
    cita: 'The post cites:',
    verificar: 'Check this text',
    privacidad: 'The image has already been discarded: it only leaves your browser to be read',
  },
})

export function LecturaRevision({
  lectura,
  onVerificar,
  onCancelar,
  className,
}: LecturaRevisionProps) {
  const [texto, setTexto] = useState(lectura.text ?? '')
  const t = useTextos(TEXTOS)
  const tag = TAG_IDIOMA[useIdioma().idioma]

  const largo = texto.trim().length
  const corto = largo < MIN_CONTENT_CHARS
  const largoDeMas = largo > MAX_CONTENT_CHARS
  const avisoLectura = t.avisoLectura[lectura.readingConfidence]

  const metadatos = [
    lectura.platform ? t.plataforma[lectura.platform] : null,
    lectura.author,
    lectura.postedAt,
  ].filter((valor): valor is string => Boolean(valor))

  return (
    <section
      className={cn('card-shell border-t-border', className)}
      aria-labelledby="revision-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 font-mono text-micro uppercase text-accent-text">
            <Eye aria-hidden="true" size={13} />
            {t.eyebrow}
          </p>
          <h2 id="revision-title" className="font-display text-h3 font-semibold text-display">
            {t.titulo}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          aria-label={t.descartar}
          className="rounded-pill border border-border p-2 text-subtle transition-colors duration-150 hover:border-border-strong hover:text-ink"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>

      <p className="text-body-sm text-muted">{t.bajada}</p>

      {metadatos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {metadatos.map((valor) => (
            <li key={valor} className="chip">
              {valor}
            </li>
          ))}
        </ul>
      )}

      {/* El aviso usa el color de "dudoso": es el mismo significado (algo acá no
          está firme) y el sistema no inventa un color nuevo para cada mensaje. */}
      {avisoLectura && <Aviso>{avisoLectura}</Aviso>}

      {!lectura.hasVerifiableClaim && <Aviso>{t.sinAfirmacion}</Aviso>}

      <label className="flex flex-col gap-3">
        <span className="font-mono text-micro uppercase text-subtle">{t.textoPublicacion}</span>
        <textarea
          rows={8}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="field-input min-h-44 resize-y text-body-sm"
          aria-label={t.textoTranscripto}
        />
      </label>

      <div className="flex justify-between gap-3 font-mono text-micro uppercase">
        <span className={corto || largoDeMas ? 'text-verdict-falso' : 'text-disabled'}>
          {t.caracteres(largo.toLocaleString(tag))}
        </span>
        {corto && (
          <span className="text-verdict-falso">{t.minimo(String(MIN_CONTENT_CHARS))}</span>
        )}
        {largoDeMas && (
          <span className="text-verdict-falso">
            {t.maximo(MAX_CONTENT_CHARS.toLocaleString(tag))}
          </span>
        )}
      </div>

      {/* La afirmación central y la fuente citada las extrajo el modelo: son
          contexto, no se editan. Lo que se verifica es el texto de arriba. */}
      {lectura.mainClaim && (
        <div className="flex flex-col gap-2 rounded-lg border border-border border-l-2 border-l-accent-text bg-surface-sunk p-4">
          <span className="font-mono text-micro uppercase text-subtle">{t.afirmacionCentral}</span>
          <p className="text-body-sm text-ink">{lectura.mainClaim}</p>
        </div>
      )}

      {lectura.citedSource && (
        <p className="flex items-start gap-2 text-caption tracking-normal text-subtle">
          <Quote aria-hidden="true" size={13} className="mt-0.5 shrink-0" />
          {t.cita} {lectura.citedSource}
        </p>
      )}

      <button
        type="button"
        onClick={() => onVerificar(texto.trim())}
        disabled={corto || largoDeMas}
        className="btn-primary w-full md:w-auto"
      >
        <ShieldCheck aria-hidden="true" size={16} />
        {t.verificar}
      </button>

      <p className="font-mono text-micro uppercase text-disabled">{t.privacidad}</p>
    </section>
  )
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-verdict-dudoso/30 bg-verdict-dudoso/10 p-3.5 text-caption tracking-normal text-verdict-dudoso"
    >
      <AlertTriangle aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
      {children}
    </p>
  )
}
