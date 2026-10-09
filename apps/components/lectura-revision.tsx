'use client'

import { useState } from 'react'
import { AlertTriangle, Eye, Quote, ShieldCheck, X } from 'lucide-react'
import {
  MAX_CONTENT_CHARS,
  MIN_CONTENT_CHARS,
  type CaptureReading,
  type Platform,
} from '@/lib/api'
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

const ETIQUETA_PLATAFORMA: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  whatsapp: 'WhatsApp',
  tiktok: 'TikTok',
  otro: 'Otra plataforma',
}

/** Qué tan legible quedó la imagen, en palabras de la pantalla. */
const AVISO_LECTURA: Record<CaptureReading['readingConfidence'], string | null> = {
  alta: null,
  media:
    'Algunas partes de la imagen quedaron difíciles de leer. Revisá el texto antes de verificar.',
  baja: 'La imagen quedó poco legible: puede faltar texto o estar mal transcripto. Si podés, volvé atrás y recortá más ajustado.',
}

export function LecturaRevision({
  lectura,
  onVerificar,
  onCancelar,
  className,
}: LecturaRevisionProps) {
  const [texto, setTexto] = useState(lectura.text ?? '')

  const largo = texto.trim().length
  const corto = largo < MIN_CONTENT_CHARS
  const largoDeMas = largo > MAX_CONTENT_CHARS
  const avisoLectura = AVISO_LECTURA[lectura.readingConfidence]

  const metadatos = [
    lectura.platform ? ETIQUETA_PLATAFORMA[lectura.platform] : null,
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
            Esto es lo que leímos
          </p>
          <h2 id="revision-title" className="font-display text-h3 font-semibold text-display">
            Revisalo antes de verificar
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          aria-label="Descartar esta lectura"
          className="rounded-pill border border-border p-2 text-subtle transition-colors duration-150 hover:border-border-strong hover:text-ink"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>

      <p className="text-body-sm text-muted">
        Corregí lo que esté mal leído: el veredicto se saca de este texto, no de la imagen.
      </p>

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

      {!lectura.hasVerifiableClaim && (
        <Aviso>
          No encontramos una afirmación verificable acá (puede ser un meme o una opinión). Podés
          verificar igual, pero probablemente salga sin datos.
        </Aviso>
      )}

      <label className="flex flex-col gap-3">
        <span className="font-mono text-micro uppercase text-subtle">
          Texto de la publicación
        </span>
        <textarea
          rows={8}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="field-input min-h-44 resize-y text-body-sm"
          aria-label="Texto transcripto de la publicación"
        />
      </label>

      <div className="flex justify-between gap-3 font-mono text-micro uppercase">
        <span className={corto || largoDeMas ? 'text-verdict-falso' : 'text-disabled'}>
          {largo.toLocaleString('es-AR')} caracteres
        </span>
        {corto && (
          <span className="text-verdict-falso">mínimo {MIN_CONTENT_CHARS}</span>
        )}
        {largoDeMas && (
          <span className="text-verdict-falso">
            máximo {MAX_CONTENT_CHARS.toLocaleString('es-AR')}
          </span>
        )}
      </div>

      {/* La afirmación central y la fuente citada las extrajo el modelo: son
          contexto, no se editan. Lo que se verifica es el texto de arriba. */}
      {lectura.mainClaim && (
        <div className="flex flex-col gap-2 rounded-lg border border-border border-l-2 border-l-accent-text bg-surface-sunk p-4">
          <span className="font-mono text-micro uppercase text-subtle">Afirmación central</span>
          <p className="text-body-sm text-ink">{lectura.mainClaim}</p>
        </div>
      )}

      {lectura.citedSource && (
        <p className="flex items-start gap-2 text-caption tracking-normal text-subtle">
          <Quote aria-hidden="true" size={13} className="mt-0.5 shrink-0" />
          El posteo cita: {lectura.citedSource}
        </p>
      )}

      <button
        type="button"
        onClick={() => onVerificar(texto.trim())}
        disabled={corto || largoDeMas}
        className="btn-primary w-full md:w-auto"
      >
        <ShieldCheck aria-hidden="true" size={16} />
        Verificar este texto
      </button>

      <p className="font-mono text-micro uppercase text-disabled">
        La imagen ya se descartó: no sale de tu navegador más que para leerla
      </p>
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
