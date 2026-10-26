'use client'

import { useState } from 'react'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'
import { VERDICT } from '@/lib/verdict'
import { cn } from '@/lib/utils'

type Respuesta = 'confiable' | 'sospechosa'

/** La respuesta correcta no depende del idioma: va aparte, una por titular. */
const CORRECTAS: Respuesta[] = ['sospechosa', 'confiable', 'sospechosa']

const TEXTOS = traducciones({
  es: {
    eyebrow: 'Ponete a prueba',
    titulo: '¿La detectás vos?',
    bajada:
      'Tres titulares. Decidí cuál te parece confiable y cuál no; después te mostramos la señal que lo delata. Son las mismas que AletheIA busca en cada nota.',
    opciones: { confiable: 'Confiable', sospechosa: 'Sospechosa' },
    acertaste: 'Acertaste',
    casi: 'Casi',
    resultado: (aciertos: number, total: number) => `Acertaste ${aciertos} de ${total}`,
    cierre:
      'Nadie tiene que hacer este trabajo a mano cada vez. Eso es lo que automatiza AletheIA — y después te muestra cómo llegó.',
    titulares: [
      {
        texto:
          'Un té casero reemplaza un tratamiento médico, según un estudio que la nota no cita.',
        porque:
          'Cura milagrosa sin estudio verificable: si no podés llegar al paper original, no hay nada que respalde la afirmación.',
      },
      {
        texto:
          'Un organismo oficial publicó su informe anual, con el documento y la metodología disponibles.',
        porque:
          'Fuente identificable y dato verificable: podés abrir el documento original y contrastar las cifras.',
      },
      {
        texto:
          'Una foto real, tomada en otro país hace tres años, circula como si fuera de acá y de ayer.',
        porque:
          'Imagen real fuera de contexto: el engaño no está en la foto sino en la fecha y el lugar que le atribuyen.',
      },
    ],
  },
  en: {
    eyebrow: 'Test yourself',
    titulo: 'Can you spot it?',
    bajada:
      "Three headlines. Decide which ones seem trustworthy and which don't; then we'll show you the signal that gives it away. They're the same ones AletheIA looks for in every article.",
    opciones: { confiable: 'Trustworthy', sospechosa: 'Suspicious' },
    acertaste: 'Correct',
    casi: 'Almost',
    resultado: (aciertos: number, total: number) => `You got ${aciertos} out of ${total}`,
    cierre:
      "Nobody should have to do this work by hand every time. That's what AletheIA automates — and then it shows you how it got there.",
    titulares: [
      {
        texto: "A homemade tea replaces a medical treatment, according to a study the article doesn't cite.",
        porque:
          "A miracle cure with no verifiable study: if you can't get to the original paper, there's nothing backing the claim.",
      },
      {
        texto:
          'A government agency published its annual report, with the document and the methodology available.',
        porque:
          'An identifiable source and verifiable data: you can open the original document and check the figures.',
      },
      {
        texto:
          'A real photo, taken in another country three years ago, is circulating as if it were from here and from yesterday.',
        porque:
          "A real image out of context: the deception isn't in the photo but in the date and place attributed to it.",
      },
    ],
  },
})

export function QuizDeteccion() {
  const t = useTextos(TEXTOS)
  const TITULARES = t.titulares.map((titular, i) => ({ ...titular, correcta: CORRECTAS[i] }))
  const [respuestas, setRespuestas] = useState<(Respuesta | null)[]>(CORRECTAS.map(() => null))

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
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id="quiz-title" className="mt-4 font-display text-h2-fluid text-display">
            {t.titulo}
          </h2>
          <p className="mt-4 text-pretty text-muted">{t.bajada}</p>
        </div>

        <div className="mt-14 grid grid-cols-1 items-start gap-6 md:grid-cols-3">
          {TITULARES.map((titular, i) => {
            const elegida = respuestas[i]
            const acerto = elegida === titular.correcta
            return (
              <div key={i} className="panel flex flex-col gap-5">
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
                      {t.opciones[opcion]}
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
                      {acerto ? t.acertaste : t.casi}
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
              {t.resultado(aciertos, TITULARES.length)}
            </p>
            <p className="text-body-sm text-muted">{t.cierre}</p>
          </div>
        )}
      </div>
    </section>
  )
}
