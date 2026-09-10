import { Mail, MessageCircle, Clock } from "lucide-react";

export default function ContactoPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 animate-fade-up">
      <h1 className="font-serif text-2xl font-bold text-ice sm:text-3xl">
        Contacto
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ¿Tenés una duda, sugerencia o encontraste un problema? Escribinos.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-light to-blue text-ice shadow-lg shadow-blue/30">
          <Mail className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-6 font-serif text-lg font-bold text-ice">
          Escribinos por email
        </h2>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Te respondemos a la brevedad. Contanos qué noticia estabas
          analizando y qué pasó, así podemos ayudarte más rápido.
        </p>
        <a
          href="mailto:contacto@borealdata.com"
          className="btn-primary mt-6 inline-flex"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          contacto@borealdata.com
        </a>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/15 text-blue-light">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ice">Tiempo de respuesta</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Normalmente respondemos dentro de 1 a 2 días hábiles.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/15 text-blue-light">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ice">Antes de escribir</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Revisá que tu consulta no esté relacionada con un problema
              temporal de conexión — probá analizar de nuevo primero.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
