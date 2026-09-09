import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import { StatsBar } from '@/components/stats-bar'
import { Features } from '@/components/features'
import { HowItWorks } from '@/components/how-it-works'
import { Footer } from '@/components/footer'
import { AuthRedirect } from '@/components/auth-redirect'

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <AuthRedirect to="/dashboard" />
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <Footer />
    </main>
  )
}
