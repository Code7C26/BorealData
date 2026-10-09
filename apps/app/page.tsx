import { AuthRedirect } from '@/components/auth-redirect'
import { AnalisisDemo } from '@/components/analisis-demo'
import { CieloEstrellado } from '@/components/cielo-estrellado'
import { CtaFinal } from '@/components/cta-final'
import { ExtensionSection } from '@/components/extension-section'
import { Faq } from '@/components/faq'
import { Footer } from '@/components/footer'
import { Hero } from '@/components/hero'
import { Navbar } from '@/components/navbar'
import { QuienesSomos } from '@/components/quienes-somos'
import { QuizDeteccion } from '@/components/quiz-deteccion'
import { StatsBar } from '@/components/stats-bar'

export default function Page() {
  return (
    /* `isolate` y el z-index del contenido dejan el cielo detrás de todo sin que
       el fondo opaco del propio main lo tape. Nada de overflow-hidden acá: rompe
       el sticky de cualquier descendiente. */
    <main className="relative isolate min-h-screen bg-bg">
      <CieloEstrellado />
      <div className="relative z-[1]">
        <AuthRedirect to="/dashboard" />
        <Navbar />
        <Hero />
        {/* El resultado real antes que cualquier argumento: la landing muestra la
            pieza, no la promete. */}
        <AnalisisDemo />
        <StatsBar />
        {/* La extensión va antes del quiz: analizar lo que no tiene enlace (una
            captura, una cadena de WhatsApp) es lo que diferencia a AletheIA de un
            chat al que le pegás un texto. El quiz entretiene, pero no explica el
            producto, así que no puede estar delante de lo que sí. */}
        <ExtensionSection />
        <QuizDeteccion />
        <QuienesSomos />
        <Faq />
        <CtaFinal />
        <Footer />
      </div>
    </main>
  )
}
