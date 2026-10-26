'use client'

import { useEffect, useState } from 'react'
import { useVocabulario } from '@/lib/use-vocabulario'
import type { Verdict } from '@/lib/verdict'
import { cn } from '@/lib/utils'

const ORDEN: Verdict[] = ['verificado', 'dudoso', 'falso', 'sin-datos']

const INTERVALO_MS = 2200

/**
 * El chip de veredicto rotando por los cuatro estados.
 *
 * No es decoración: enseña el vocabulario del producto antes de que alguien
 * analice nada. Los cuatro estados son siempre color + etiqueta, nunca un color
 * solo, así que acá también van juntos.
 */
export function PalabraRotativa({ className }: { className?: string }) {
  const [indice, setIndice] = useState(0)
  const { VERDICT } = useVocabulario()

  useEffect(() => {
    const id = setInterval(() => setIndice((i) => (i + 1) % ORDEN.length), INTERVALO_MS)
    return () => clearInterval(id)
  }, [])

  const verdict = ORDEN[indice]
  const meta = VERDICT[verdict]
  const Icon = meta.icon

  return (
    <span
      key={verdict}
      aria-live="off"
      className={cn('chip animate-rise', meta.text, className)}
    >
      <Icon aria-hidden="true" size={14} strokeWidth={2.25} />
      {meta.label}
    </span>
  )
}
