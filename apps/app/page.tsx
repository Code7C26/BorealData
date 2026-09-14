import { AuthRedirect } from '@/components/auth-redirect'
import { AnalisisDemo } from '@/components/analisis-demo'
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
    <main className="min-h-screen bg-bg">
      <AuthRedirect to="/dashboard" />
      <Navbar />
      <Hero />
      {/* El resultado real antes que cualquier argumento: la landing muestra la
          pieza, no la promete. */}
      <AnalisisDemo />
      <StatsBar />
      <QuizDeteccion />
      <ExtensionSection />
      <QuienesSomos />
      <Faq />
      <CtaFinal />
      <Footer />
    </main>
  )
}
