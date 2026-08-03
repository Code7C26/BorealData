const steps = [
  {
    number: '1',
    title: 'Pegás la noticia',
    description: 'URL o texto desde WhatsApp, redes o cualquier sitio.',
  },
  {
    number: '2',
    title: 'AletheIA analiza',
    description:
      'La IA verifica fuentes y detecta inconsistencias en segundos.',
  },
  {
    number: '3',
    title: 'Recibís el resultado',
    description: 'Veredicto claro con razonamiento completo paso a paso.',
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t border-border/60 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-serif text-4xl font-bold text-ice">
            Cómo funciona
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Tres pasos simples para saber si podés confiar en una noticia.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue bg-navy-light font-serif text-2xl font-bold text-blue-light">
                {step.number}
              </div>
              <h3 className="mt-6 font-serif text-xl font-bold text-ice">
                {step.title}
              </h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
