'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Sparkles } from 'lucide-react'
import { AnalysisPanel, MAX_CHARS, type AnalysisState } from '@/components/result/analysis-panel'
import { guardarBorrador, leerBorrador } from '@/lib/resultado-storage'
import { cn } from '@/lib/utils'

/**
 * Estado inicial · vacío — y el formulario de análisis.
 *
 * El vacío ES el formulario: nunca una ilustración vacía ni un "aún no hay
 * nada". Es el estado de trabajo, no un hueco esperando contenido.
 *
 * El borde superior va en borde neutro: ningún color de veredicto antes de
 * tener veredicto.
 */
export function AnalisisInput({ className }: { className?: string }) {
  const router = useRouter()
  const [valor, setValor] = useState('')
  const [estado, setEstado] = useState<AnalysisState>({ kind: 'idle' })

  // El input jamás se pierde: si volvió acá después de un error (o recargó),
  // reponemos lo que había pegado.
  useEffect(() => {
    const borrador = leerBorrador()
    if (borrador) setValor(borrador)
  }, [])

  const analizar = (texto: string) => {
    const limpio = texto.trim()
    if (!limpio) return

    guardarBorrador(limpio)

    if (limpio.length > MAX_CHARS) {
      setEstado({ kind: 'error-too-long', length: limpio.length })
      return
    }

    if (!esUrlDeNota(limpio)) {
      setEstado({ kind: 'error-url', value: limpio })
      return
    }

    router.push(`/analizando?tipo=url&valor=${encodeURIComponent(limpio)}`)
  }

  // /ejemplo es una ruta pública: el ejemplo tiene que poder verse SIN cuenta,
  // que es justo para quien sirve. (Antes iba a /resultado, dentro del área
  // autenticada, y a un visitante lo escupía al login.)
  const verEjemplo = () => router.push('/ejemplo')

  if (estado.kind !== 'idle') {
    return (
      <AnalysisPanel
        state={estado}
        className={className}
        onEditar={() => setEstado({ kind: 'idle' })}
        onTruncate={() => analizar(valor.trim().slice(0, MAX_CHARS))}
      />
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        analizar(valor)
      }}
      className={cn('card-shell border-t-border', className)}
      aria-labelledby="idle-title"
    >
      <h2 id="idle-title" className="font-display text-h3 font-semibold text-display">
        Pegá el enlace de la nota que querés chequear
      </h2>
      <p className="text-body-sm text-muted">
        Tarda unos segundos y te mostramos cada paso del análisis.
      </p>

      <label className="flex flex-col gap-3">
        <span className="sr-only">Enlace de la nota</span>
        <textarea
          rows={3}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            // Enter analiza; Shift+Enter deja escribir varias líneas.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              analizar(valor)
            }
          }}
          maxLength={MAX_CHARS * 2}
          spellCheck={false}
          placeholder="https://diario-ejemplo.com/nota/8821"
          className="field-input resize-y font-mono text-caption tracking-normal"
          aria-label="Enlace de la nota"
        />
      </label>

      <div className="flex flex-col gap-3 md:flex-row">
        <button type="submit" disabled={!valor.trim()} className="btn-primary w-full md:w-auto">
          <Search aria-hidden="true" size={16} />
          Analizar
        </button>
        <button type="button" onClick={verEjemplo} className="btn-secondary w-full md:w-auto">
          <Sparkles aria-hidden="true" size={16} />
          Probar un ejemplo
        </button>
      </div>

      {/* La promesa de privacidad va en micro, abajo, sin ícono de candado. */}
      <p className="font-mono text-micro uppercase text-disabled">No guardamos lo que analizás</p>
    </form>
  )
}

/**
 * ¿Esto parece un enlace a una publicación?
 *
 * Deliberadamente permisivo: acepta sin protocolo (la gente copia
 * "diario.com/nota" desde el navegador) pero exige host con punto y TLD de al
 * menos dos letras, que es lo que separa un enlace cortado de uno entero.
 * Las validaciones que importan de verdad las hace el backend al scrapear.
 */
function esUrlDeNota(valor: string): boolean {
  if (/\s/.test(valor)) return false
  try {
    const url = new URL(/^https?:\/\//i.test(valor) ? valor : `https://${valor}`)
    return /^[^.]+(\.[^.]+)+$/.test(url.hostname) && /\.[a-z]{2,}$/i.test(url.hostname)
  } catch {
    return false
  }
}
