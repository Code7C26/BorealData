'use client'

import Link from 'next/link'
import { ArrowUpRight, Crop, KeyRound, PanelRight } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { LogoChrome } from '@/components/logo-chrome'
import { ANALISIS_EJEMPLO as EJEMPLO_POR_IDIOMA } from '@/lib/ejemplo'
import { URL_CHROME_WEB_STORE } from '@/lib/extension-store'
import { traducciones } from '@/lib/idioma'
import { useTextos } from '@/lib/use-idioma'
import { useVocabulario } from '@/lib/use-vocabulario'
import { cn } from '@/lib/utils'

const TEXTOS = traducciones({
  es: {
    confianza: (nivel: string) => `Confianza ${nivel}`,
    urlMaqueta: 'diario-ejemplo.com/nota/8821',
    disponible: 'Ya disponible en la Chrome Web Store',
    titulo: 'Verificá sin salir',
    tituloDestacado: 'de la nota',
    bajada:
      'AletheIA se abre en un panel al costado de la página que estás leyendo. Un clic y tenés el veredicto, la confianza y las fuentes al lado del texto, sin copiar enlaces ni cambiar de pestaña.',
    beneficios: [
      { titulo: 'Un clic, en cualquier página', texto: 'El panel analiza la nota que tenés abierta.' },
      { titulo: 'También lo que no tiene enlace', texto: 'Recortá una captura o una imagen y la verificás ahí mismo.' },
      { titulo: 'Tu misma cuenta', texto: 'Si entraste en la web, la extensión ya está lista. Sin otro login.' },
    ],
    agregar: 'Agregar a Chrome',
    crearCuenta: 'Crear cuenta',
    letraChica: 'Gratis · Chrome, Edge, Brave y otros Chromium en computadora',
    bajadaCorta: 'Un panel al costado de la nota: veredicto y fuentes sin cambiar de pestaña.',
    insignia: 'Disponible en',
    insigniaTienda: 'Chrome Web Store',
  },
  en: {
    confianza: (nivel: string) => `${nivel} confidence`,
    urlMaqueta: 'example-news.com/article/8821',
    disponible: 'Now on the Chrome Web Store',
    titulo: 'Check without leaving',
    tituloDestacado: 'the article',
    bajada:
      "AletheIA opens in a panel next to the page you're reading. One click and you have the verdict, the confidence and the sources right beside the text, without copying links or switching tabs.",
    beneficios: [
      { titulo: 'One click, on any page', texto: 'The panel analyzes the article you have open.' },
      { titulo: "Even what has no link", texto: 'Crop a screenshot or an image and check it right there.' },
      { titulo: 'Your same account', texto: "If you're signed in on the web, the extension is ready. No second login." },
    ],
    agregar: 'Add to Chrome',
    crearCuenta: 'Create an account',
    letraChica: 'Free · Chrome, Edge, Brave and other Chromium browsers on desktop',
    bajadaCorta: 'A panel next to the article: verdict and sources without switching tabs.',
    insignia: 'Available on the',
    insigniaTienda: 'Chrome Web Store',
  },
})

/** En el mismo orden que `beneficios` en TEXTOS. */
const ICONOS_BENEFICIOS = [PanelRight, Crop, KeyRound]

function BarraDeTexto({ ancho, alto = 'h-2' }: { ancho: string; alto?: string }) {
  return <span className={cn(alto, 'block rounded-sm bg-border-strong')} style={{ width: ancho }} />
}

/**
 * La maqueta del panel lateral.
 *
 * Usa el mismo análisis de ejemplo que la card grande, apretado al ancho del
 * side panel: el veredicto, la barra de cinco segmentos y las dos primeras
 * fuentes con su postura. Es la prueba de que el sistema sobrevive a 190 px.
 */
function MaquetaPanel() {
  const t = useTextos(TEXTOS)
  const ANALISIS_EJEMPLO = useTextos(EJEMPLO_POR_IDIOMA)
  const { CONFIDENCE, STANCE, VERDICT } = useVocabulario()
  const meta = VERDICT[ANALISIS_EJEMPLO.verdict]
  const Icon = meta.icon
  const confianza = CONFIDENCE[ANALISIS_EJEMPLO.confidence]

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2rem] blur-2xl"
        style={{ background: 'radial-gradient(circle at 70% 40%, var(--aurora-a), transparent 68%)' }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
        {/* Barra del navegador */}
        <div className="flex items-center gap-2 border-b border-border bg-surface-sunk px-4 py-3">
          <span className="size-2.5 rounded-pill bg-verdict-falso" />
          <span className="size-2.5 rounded-pill bg-verdict-dudoso" />
          <span className="size-2.5 rounded-pill bg-verdict-verificado" />
          <span className="ml-2.5 h-6 flex-1 truncate rounded-pill border border-border bg-bg px-3 font-mono text-[10px] leading-6 text-disabled">
            {t.urlMaqueta}
          </span>
        </div>

        <div className="grid min-h-[320px] grid-cols-[1fr_200px]">
          {/* La nota */}
          <div className="flex flex-col gap-3 p-6" aria-hidden="true">
            <BarraDeTexto ancho="85%" alto="h-3" />
            <BarraDeTexto ancho="60%" alto="h-3" />
            <div className="mt-2 flex flex-col gap-2.5">
              {['100%', '96%', '99%', '72%', '92%', '55%', '88%'].map((w, i) => (
                <BarraDeTexto key={i} ancho={w} />
              ))}
            </div>
          </div>

          {/* El side panel de AletheIA */}
          <div className={cn('flex flex-col gap-4 border-l border-border bg-surface-sunk p-4', 'border-t-[3px]', meta.borderTop)}>
            <div className="flex items-center gap-2">
              <LogoMark className="size-5" />
              <span className="font-display text-[11px] font-bold tracking-[-0.01em] text-display">
                Alethe<span className="text-accent-text">IA</span>
              </span>
            </div>

            <span className={cn('inline-flex items-center gap-2 self-start rounded-pill border border-current px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em]', meta.text)}>
              <Icon aria-hidden="true" size={11} strokeWidth={2.5} />
              {meta.label}
            </span>

            <p className="font-display text-[12.5px] leading-snug font-semibold text-display">
              {ANALISIS_EJEMPLO.headline}
            </p>

            <div className="flex flex-col gap-1.5">
              <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'flex-1 rounded-pill',
                      i <= ANALISIS_EJEMPLO.confidence ? meta.bg : 'bg-border',
                    )}
                  />
                ))}
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-subtle">
                {t.confianza(confianza.label.toLowerCase())}
              </span>
            </div>

            <ul className="flex flex-col gap-1.5 border-t border-border pt-3">
              {ANALISIS_EJEMPLO.sources.slice(0, 3).map((s) => (
                <li key={s.domain} className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[9.5px] text-muted">{s.domain}</span>
                  <span className={cn('shrink-0 font-mono text-[9px] uppercase', STANCE[s.stance].text)}>
                    {STANCE[s.stance].label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ExtensionSection() {
  const t = useTextos(TEXTOS)

  return (
    <section
      id="extension"
      className="relative isolate overflow-hidden border-t border-border px-gutter py-20 md:px-6 md:py-40"
      aria-labelledby="extension-title"
    >
      <div className="relative mx-auto grid max-w-shell grid-cols-1 items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          {/* El "ya está" va primero y con el punto vivo: es la novedad de la sección. */}
          <a
            href={URL_CHROME_WEB_STORE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-pill border border-border bg-surface px-3.5 py-1.5 font-mono text-micro uppercase text-accent-text transition-colors duration-150 ease-boreal hover:border-accent-text"
          >
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inset-0 animate-ping rounded-pill bg-verdict-verificado opacity-60" />
              <span className="relative size-2 rounded-pill bg-verdict-verificado" />
            </span>
            {t.disponible}
          </a>
          <h2 id="extension-title" className="mt-5 text-balance font-display text-[1.5rem] leading-[1.1] font-semibold tracking-[-0.02em] text-display md:text-h2-fluid">
            {t.titulo} <span className="text-aurora">{t.tituloDestacado}</span>
          </h2>
          <p className="mt-3 max-w-texto text-pretty text-body-sm text-muted md:mt-4 md:text-body">
            <span className="md:hidden">{t.bajadaCorta}</span>
            <span className="hidden md:inline">{t.bajada}</span>
          </p>

          <ul className="mt-8 hidden flex-col gap-4 md:flex">
            {t.beneficios.map((b, i) => {
              const Icono = ICONOS_BENEFICIOS[i]
              return (
                <li key={b.titulo} className="flex items-start gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-accent-text">
                    <Icono aria-hidden="true" size={16} />
                  </span>
                  <span className="flex flex-col gap-0.5 pt-0.5">
                    <span className="font-display text-body-sm font-semibold text-display">{b.titulo}</span>
                    <span className="text-body-sm text-muted">{b.texto}</span>
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4 md:mt-10">
            <a href={URL_CHROME_WEB_STORE} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <LogoChrome />
              {t.agregar}
              <ArrowUpRight aria-hidden="true" size={16} />
            </a>
            <Link href="/registro" className="btn-secondary">
              {t.crearCuenta}
            </Link>
          </div>
          <p className="mt-4 hidden font-mono text-micro uppercase text-disabled md:block">{t.letraChica}</p>
        </div>

        <div className="relative hidden md:block">
          <MaquetaPanel />
          {/* La insignia de la tienda flotando sobre la maqueta: el mismo pedido que
              el botón, dicho como lo dice el resto de la web (sello, no banner). */}
          <a
            href={URL_CHROME_WEB_STORE}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg transition-transform duration-150 ease-boreal hover:-translate-y-0.5 sm:-left-6"
          >
            <LogoChrome className="size-8" />
            <span className="flex flex-col leading-tight">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-subtle">{t.insignia}</span>
              <span className="font-display text-body-sm font-semibold text-display">{t.insigniaTienda}</span>
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}
