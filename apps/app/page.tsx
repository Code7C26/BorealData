import { AuthRedirect } from '@/components/auth-redirect'
import { AnalisisDemo } from '@/components/analisis-demo'
import { CieloEstrellado } from '@/components/cielo-estrellado'
import { CtaFinal } from '@/components/cta-final'
import { ExtensionSection } from '@/components/extension-section'
import { Faq } from '@/components/faq'
import { Footer } from '@/components/footer'
import { Hero } from '@/components/hero'
import { Navbar } from '@/components/navbar'
import { Pilares } from '@/components/pilares'
import { Planes } from '@/components/planes'
import { QuienesSomos } from '@/components/quienes-somos'
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
        {/* El recorrido de la landing:
            1. Hero — qué es y el CTA real (pegar un enlace).
            2. Prueba social — cifras y medios reales de /stats, nada inventado.
            3. Tres pilares — por qué AletheIA, escaneable en tres líneas.
            4. El resultado de verdad — la pieza, no una ilustración de ella.
            5. Extensión — lo que lo diferencia de un chat (capturas, sin cambiar de pestaña).
            6. Planes — comparar y elegir.
            7. Confianza y dudas — quiénes somos y preguntas.
            8. CTA final. */}
        <Hero />
        <StatsBar />
        <Pilares />
        <AnalisisDemo />
        <ExtensionSection />
        <Planes />
        <QuienesSomos />
        <Faq />
        <CtaFinal />
        <Footer />
      </div>
    </main>
  )
}
