'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const PREGUNTAS = [
  {
    pregunta: '¿Por qué no me dan un porcentaje?',
    respuesta:
      'Porque un "72 % de veracidad" finge una precisión que ningún análisis tiene: no hay forma de auditar ese 72. En su lugar damos cuatro veredictos cerrados —verificado, dudoso, falso, sin datos suficientes— y, por separado, cinco niveles de confianza que dicen qué tan sólida es la evidencia que conseguimos.',
  },
  {
    pregunta: '¿Qué diferencia hay entre el veredicto y la confianza?',
    respuesta:
      'El veredicto es sobre la nota: si lo que afirma se sostiene. La confianza es sobre nosotros: cuánto pudimos verificar. "Falso" con confianza alta significa que llegamos a la fuente primaria y la contradice. Si no llegamos a la fuente primaria, el veredicto no puede ser "falso" ni "verificado": queda en "dudoso" o en "sin datos".',
  },
  {
    pregunta: '¿Qué puedo analizar hoy?',
    respuesta:
      'Enlaces de notas periodísticas: pegás la dirección y AletheIA se encarga del resto. El análisis de texto pegado a mano está en camino.',
  },
  {
    pregunta: '¿Cómo llega AletheIA a un veredicto?',
    respuesta:
      'Lee la nota y extrae sus afirmaciones, identifica las instituciones citadas, las busca en sus fuentes primarias y revisa qué dijeron verificadores independientes. Cada uno de esos pasos queda listado en el resultado, con las fuentes y su postura, incluso las que contradicen el veredicto.',
  },
  {
    pregunta: '¿El veredicto es definitivo?',
    respuesta:
      'No, y es a propósito. AletheIA muestra en qué se basó para que puedas revisarlo vos: las fuentes están enlazadas, los pasos están a la vista y la decisión sigue siendo tuya.',
  },
  {
    pregunta: '¿Hay algo para el navegador?',
    respuesta:
      'Sí: la extensión abre AletheIA en un panel lateral sobre la página que estás leyendo, así verificás sin copiar enlaces ni cambiar de pestaña.',
  },
]

export function Faq() {
  const [abierta, setAbierta] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="border-t border-border px-gutter py-32 md:px-6 md:py-40"
      aria-labelledby="faq-title"
    >
      <div className="mx-auto grid max-w-shell grid-cols-1 gap-16 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="eyebrow">Preguntas</p>
          <h2 id="faq-title" className="mt-4 text-balance font-display text-h2-fluid text-display">
            Lo que suelen preguntarnos
          </h2>
        </div>

        <div>
          {PREGUNTAS.map((item, i) => {
            const abierto = abierta === i
            return (
              <div key={item.pregunta} className="border-b border-border">
                <button
                  onClick={() => setAbierta(abierto ? null : i)}
                  aria-expanded={abierto}
                  className="flex w-full items-center justify-between gap-5 py-6 text-left font-display text-body font-semibold text-display"
                >
                  {item.pregunta}
                  <ChevronDown
                    aria-hidden="true"
                    size={20}
                    className={cn(
                      'shrink-0 text-accent-text transition-transform duration-300 ease-boreal',
                      abierto ? 'rotate-180' : 'rotate-0',
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'grid transition-all duration-300 ease-boreal',
                    abierto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-texto pb-6 text-muted">{item.respuesta}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
