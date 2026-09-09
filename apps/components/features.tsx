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
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-light/60 hover:shadow-[0_24px_48px_-20px_rgba(2,8,15,0.6),0_0_60px_-20px_rgba(96,184,240,0.45)]"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-light/10 blur-3xl transition-opacity duration-300 group-hover:opacity-100 opacity-0"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-light to-blue text-ice shadow-lg shadow-blue/30 transition-transform duration-300 group-hover:scale-110">
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
