import { Brain, ShieldCheck, FileText } from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'Motor de IA',
    description:
      'Gemini analiza el contenido y detecta inconsistencias en el texto automáticamente.',
  },
  {
    icon: ShieldCheck,
    title: 'Verificación de fuentes',
    description:
      'Cruzamos la información con bases de datos de fuentes periodísticas confiables.',
  },
  {
    icon: FileText,
    title: 'Análisis transparente',
    description:
      'Explicamos paso a paso por qué una noticia es confiable o no.',
  },
]

export function Features() {
  return (
    <section id="acerca-de" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-blue-light/50 hover:shadow-xl hover:shadow-blue/10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue/15 text-blue-light transition-colors group-hover:bg-blue-light group-hover:text-navy">
                <feature.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-6 font-serif text-xl font-bold text-ice">
                {feature.title}
              </h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
