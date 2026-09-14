import { Clock, Mail, MessageCircle } from 'lucide-react'

const NOTAS = [
  {
    icon: Clock,
    titulo: 'Tiempo de respuesta',
    texto: 'Normalmente contestamos dentro de 1 a 2 días hábiles.',
  },
  {
    icon: MessageCircle,
    titulo: 'Antes de escribir',
    texto:
      'Si el análisis se cortó, probá de nuevo: suele ser un corte momentáneo de conexión con la fuente.',
  },
]

export default function ContactoPage() {
  return (
    <div className="mx-auto flex w-full max-w-card flex-col gap-6 px-gutter py-12 md:px-6 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">Contacto</p>
        <h1 className="font-display text-h2-fluid text-display">Escribinos</h1>
        <p className="max-w-texto text-muted">
          ¿Una duda, una sugerencia, o un análisis que salió raro? Contanos qué nota estabas
          verificando y qué pasó.
        </p>
      </header>

      <section className="card-shell border-t-accent">
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-bruma">
          <Mail aria-hidden="true" size={22} />
        </span>
        <h2 className="font-display text-h3 font-semibold text-display">Por email</h2>
        <p className="text-body-sm text-muted">
          Es el canal que miramos todos los días. Si podés, pegá el enlace de la nota: con eso
          reproducimos el caso enseguida.
        </p>
        <a href="mailto:contacto@borealdata.com" className="btn-primary self-start">
          <Mail aria-hidden="true" size={16} />
          contacto@borealdata.com
        </a>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {NOTAS.map(({ icon: Icon, titulo, texto }) => (
          <section key={titulo} className="panel flex items-start gap-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-pill border border-border text-accent-text">
              <Icon aria-hidden="true" size={16} />
            </span>
            <div>
              <h2 className="font-mono text-micro uppercase text-subtle">{titulo}</h2>
              <p className="mt-2 text-body-sm text-muted">{texto}</p>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
