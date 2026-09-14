'use client'

import { useState } from 'react'
import { VERDICT } from '@/lib/verdict'
import { cn } from '@/lib/utils'

type Respuesta = 'confiable' | 'sospechosa'

interface Titular {
  texto: string
  correcta: Respuesta
  porque: string
}

const TITULARES: Titular[] = [
  {
    texto:
      'Un té casero reemplaza un tratamiento médico, según un estudio que la nota no cita.',
    correcta: 'sospechosa',
    porque:
      'Cura milagrosa sin estudio verificable: si no podés llegar al paper original, no hay nada que respalde la afirmación.',
  },
  {
    texto:
      'Un organismo oficial publicó su informe anual, con el documento y la metodología disponibles.',
    correcta: 'confiable',
    porque:
      'Fuente identificable y dato verificable: podés abrir el documento original y contrastar las cifras.',
  },
  {
    texto:
      'Una foto real, tomada en otro país hace tres años, circula como si fuera de acá y de ayer.',
    correcta: 'sospechosa',
    porque:
      'Imagen real fuera de contexto: el engaño no está en la foto sino en la fecha y el lugar que le atribuyen.',
  },
]

export function QuizDeteccion() {
  const [respuestas, setRespuestas] = useState<(Respuesta | null)[]>(TITULARES.map(() => null))

  const responder = (indice: number, eleccion: Respuesta) => {
    setRespuestas((previas) => {
      if (previas[indice] !== null) return previas
      const siguientes = [...previas]
      siguientes[indice] = eleccion
      return siguientes
    })
  }

  const contestadas = respuestas.filter((r) => r !== null).length
  const aciertos = respuestas.filter((r, i) => r !== null && r === TITULARES[i].correcta).length
  const terminado = contestadas === TITULARES.length

  /**
   * Una vez contestado, la opción correcta se marca en verde y la elegida por
   * error en ámbar — nunca en coral: el coral está reservado al veredicto de
   * una nota, y equivocarse en un juego no es una noticia falsa.
   */
  const estiloBoton = (indice: number, opcion: Respuesta): string => {
    const elegida = respuestas[indice]
    if (elegida === null) {
      return 'border-border text-muted hover:border-accent-text hover:text-accent-text'
    }
    if (opcion === TITULARES[indice].correcta) {
      return 'border-verdict-verificado text-verdict-verificado'
    }
    if (opcion === elegida) return 'border-verdict-dudoso text-verdict-dudoso'
    return 'border-border text-disabled'
  }

  return (
    <section
      className="relative isolate overflow-hidden border-t border-border px-gutter py-32 md:px-6 md:py-40"
      aria-labelledby="quiz-title"
    >
      <div className="relative mx-auto max-w-shell">
        <div className="max-w-texto">
          <p className="eyebrow">Ponete a prueba</p>
          <h2 id="quiz-title" className="mt-4 font-display text-h2-fluid text-display">
            ¿La detectás vos?
          </h2>
          <p className="mt-4 text-pretty text-muted">
            Tres titulares. Decidí cuál te parece confiable y cuál no; después te mostramos la
            señal que lo delata. Son las mismas que AletheIA busca en cada nota.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 items-start gap-6 md:grid-cols-3">
          {TITULARES.map((titular, i) => {
            const elegida = respuestas[i]
            const acerto = elegida === titular.correcta
            return (
              <div key={titular.texto} className="panel flex flex-col gap-5">
                <div className="flex items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="w-5 shrink-0 pt-1 font-mono text-caption tracking-normal text-subtle"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="font-display text-body font-semibold leading-snug text-display">
                    {titular.texto}
                  </p>
                </div>

                <div className="flex gap-3">
                  {(['confiable', 'sospechosa'] as const).map((opcion) => (
                    <button
                      key={opcion}
                      onClick={() => responder(i, opcion)}
                      disabled={elegida !== null}
                      className={cn(
                        'flex-1 rounded-pill border py-3 font-display text-body-sm font-medium',
                        'transition-colors duration-200 ease-boreal disabled:cursor-default',
                        estiloBoton(i, opcion),
                      )}
                    >
                      {opcion === 'confiable' ? 'Confiable' : 'Sospechosa'}
                    </button>
                  ))}
                </div>

                {elegida !== null && (
                  <div className="flex animate-rise flex-col gap-3 border-t border-border pt-4">
                    <span
                      className={cn(
                        'self-start rounded-pill border border-current px-2.5 py-1 font-mono text-micro uppercase',
                        acerto ? VERDICT.verificado.text : VERDICT.dudoso.text,
                      )}
                    >
                      {acerto ? 'Acertaste' : 'Casi'}
                    </span>
                    <p className="text-body-sm text-muted">{titular.porque}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {terminado && (
          <div className="mt-8 flex max-w-texto animate-rise flex-col gap-2 border-t-[3px] border-t-accent bg-surface p-6 md:rounded-2xl">
            <p className="font-display text-h3 font-semibold text-display">
              Acertaste {aciertos} de {TITULARES.length}
            </p>
            <p className="text-body-sm text-muted">
              Nadie tiene que hacer este trabajo a mano cada vez. Eso es lo que automatiza
              AletheIA — y después te muestra cómo llegó.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
