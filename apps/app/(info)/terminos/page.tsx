import type { Metadata } from 'next'
import Link from 'next/link'
import { EncabezadoLegal, Lista, Seccion } from '@/components/pagina-legal'
import { traducciones } from '@/lib/idioma'
import { leerIdioma } from '@/lib/idioma-servidor'

const METADATA = traducciones<Metadata>({
  es: {
    title: 'Términos y condiciones — AletheIA',
    description:
      'Qué es AletheIA, qué no es, qué podés esperar de un veredicto y cuáles son las reglas de uso.',
  },
  en: {
    title: 'Terms and conditions — AletheIA',
    description:
      "What AletheIA is, what it isn't, what you can expect from a verdict and what the rules of use are.",
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return METADATA[await leerIdioma()]
}

/**
 * Términos y condiciones.
 *
 * El apartado que importa de verdad es "Qué es y qué no es un veredicto": una
 * herramienta de verificación automática que no aclara sus propios límites se
 * contradice a sí misma. Va arriba por eso, antes de las reglas de uso.
 *
 * Dos textos enteros, por el mismo motivo que en privacidad/page.tsx. Si cambia
 * uno, cambia el otro en el mismo commit.
 */
export default async function TerminosPage() {
  return (await leerIdioma()) === 'en' ? <ContenidoEn /> : <ContenidoEs />
}

function ContenidoEs() {
  return (
    <article className="flex flex-col gap-8">
      <EncabezadoLegal
        volanta="Términos y condiciones"
        titulo="Las reglas, en castellano"
        bajada="Qué es AletheIA, qué no es, y qué esperamos de vos al usarla. Si algo de acá no te cierra, escribinos antes de crear una cuenta."
        fecha="8 de octubre de 2026"
      />

      <Seccion titulo="Qué es AletheIA">
        <p>
          Una herramienta que analiza una nota o una publicación con un modelo de inteligencia
          artificial y te devuelve un veredicto, un nivel de confianza, las fuentes que
          consultó y los pasos del razonamiento. La desarrolla <strong>Boreal Data</strong>{' '}
          (Renzo Lanata y Ciro Di Marsico) y hoy es gratuita.
        </p>
      </Seccion>

      <Seccion titulo="Qué es, y qué no es, un veredicto">
        <p>
          Esto es lo más importante de estos términos, así que va sin vueltas:{' '}
          <strong>
            un veredicto de AletheIA es el resultado de un análisis automático, no un dictamen
            de un verificador profesional.
          </strong>
        </p>
        <Lista>
          <li>
            <strong>Se puede equivocar.</strong> El modelo puede leer mal una cifra, no
            encontrar una fuente que existe, o darle entidad a una que no la tiene. Por eso
            mostramos el razonamiento y las fuentes: para que puedas revisar el camino, no solo
            la conclusión.
          </li>
          <li>
            <strong>El nivel de confianza habla de la evidencia, no de la gravedad.</strong>{' '}
            Confianza 5 significa que llegamos a la fuente primaria y a verificadores
            independientes; confianza 1, que había una sola fuente secundaria.
          </li>
          <li>
            <strong>&ldquo;Sin datos&rdquo; no es un error.</strong> Es el veredicto honesto
            cuando la búsqueda no alcanza para afirmar ni para desmentir.
          </li>
          <li>
            <strong>No lo uses como única base para una decisión que importe.</strong> Ni para
            acusar a nadie, ni para una nota periodística, ni para una decisión legal, médica o
            económica. Es un punto de partida para mirar mejor.
          </li>
        </Lista>
        <p>
          En términos legales: el servicio se ofrece &ldquo;tal cual está&rdquo;, sin garantía
          de que un veredicto sea correcto, completo o actual, y no respondemos por decisiones
          que alguien tome a partir de un análisis.
        </p>
      </Seccion>

      <Seccion titulo="Tu cuenta">
        <Lista>
          <li>
            Necesitás una cuenta para analizar. Cada análisis consume una consulta real a un
            modelo pago, y la cuenta es lo que nos permite sostener el servicio gratis sin que
            se abuse de él.
          </li>
          <li>
            Los datos que das al registrarte tienen que ser tuyos y ser ciertos. Sos
            responsable de lo que se haga desde tu cuenta.
          </li>
          <li>
            Hay un límite de 20 análisis nuevos por hora. No es una restricción comercial: es
            el techo que nos permite no quedarnos sin presupuesto.
          </li>
          <li>Tenés que tener 13 años o más.</li>
        </Lista>
      </Seccion>

      <Seccion titulo="Qué no podés hacer">
        <Lista>
          <li>
            Usar AletheIA para acosar, difamar o señalar a una persona concreta. Nuestros
            análisis hablan del contenido, nunca de quien lo comparte, y esperamos lo mismo de
            su uso.
          </li>
          <li>
            Analizar contenido al que accedés sin permiso, o subir capturas de conversaciones
            ajenas que no te corresponde compartir.
          </li>
          <li>
            Automatizar el uso del servicio (scripts, bots, reventa de los análisis) o
            intentar saltear los límites por hora.
          </li>
          <li>
            Presentar un veredicto nuestro como si fuera una verificación profesional, o
            atribuirnos una conclusión que no dimos.
          </li>
        </Lista>
        <p>
          Si pasa algo de esto podemos suspender la cuenta. Si es grave, sin aviso previo.
        </p>
      </Seccion>

      <Seccion titulo="El contenido que analizás">
        <p>
          Lo que pegás o capturás sigue siendo de quien sea su dueño: no nos adjudicamos
          ningún derecho sobre eso. Solo lo usamos para producir el análisis que pediste. Qué
          se guarda y qué no está detallado en la{' '}
          <Link href="/privacidad" className="text-accent-text underline">
            política de privacidad
          </Link>
          , y vale la pena leer la parte de que el contenido viaja a Google.
        </p>
        <p>
          El análisis en sí (el texto del veredicto, el razonamiento, el resumen) lo generamos
          nosotros y podés compartirlo y citarlo libremente, mencionando que salió de AletheIA.
        </p>
      </Seccion>

      <Seccion titulo="Disponibilidad">
        <p>
          Es un proyecto en desarrollo, hecho por dos personas. Puede estar caído, puede ser
          lento, y podemos cambiar o discontinuar funciones. Si alguna vez decidimos cerrarlo,
          avisamos con tiempo para que puedas llevarte tu historial.
        </p>
      </Seccion>

      <Seccion titulo="Si cambian estos términos">
        <p>
          Actualizamos la fecha de arriba y te avisamos por correo antes de que entre en
          vigencia. Si no estás de acuerdo con un cambio, podés cerrar tu cuenta.
        </p>
      </Seccion>

      <Seccion titulo="Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de la República Argentina y cualquier conflicto
          se resuelve ante sus tribunales ordinarios.
        </p>
      </Seccion>

      <p className="text-body-sm text-muted">
        Ver también la{' '}
        <Link href="/privacidad" className="text-accent-text underline">
          política de privacidad
        </Link>
        .
      </p>
    </article>
  )
}

function ContenidoEn() {
  return (
    <article className="flex flex-col gap-8">
      <EncabezadoLegal
        volanta="Terms and conditions"
        titulo="The rules, in plain English"
        bajada="What AletheIA is, what it isn't, and what we expect from you when you use it. If something here doesn't sit right with you, write to us before creating an account."
        fecha="October 8, 2026"
        etiquetaFecha="Last updated"
      />

      <p className="max-w-texto text-caption text-subtle">
        This is a translation provided for convenience. If there is any discrepancy, the
        Spanish version of these terms prevails.
      </p>

      <Seccion titulo="What AletheIA is">
        <p>
          A tool that analyzes an article or a post with an artificial intelligence model and
          gives you back a verdict, a confidence level, the sources it checked and the steps of
          its reasoning. It is developed by <strong>Boreal Data</strong> (Renzo Lanata and Ciro
          Di Marsico) and is currently free.
        </p>
      </Seccion>

      <Seccion titulo="What a verdict is, and what it isn't">
        <p>
          This is the most important part of these terms, so here it is straight:{' '}
          <strong>
            an AletheIA verdict is the result of an automated analysis, not the ruling of a
            professional fact-checker.
          </strong>
        </p>
        <Lista>
          <li>
            <strong>It can be wrong.</strong> The model can misread a figure, fail to find a
            source that exists, or give weight to one that doesn&apos;t deserve it. That&apos;s
            why we show the reasoning and the sources: so you can review the path, not just the
            conclusion.
          </li>
          <li>
            <strong>The confidence level is about the evidence, not about how serious it is.</strong>{' '}
            Confidence 5 means we reached the primary source and independent fact-checkers;
            confidence 1, that there was a single secondary source.
          </li>
          <li>
            <strong>&ldquo;Not enough data&rdquo; is not an error.</strong> It is the honest
            verdict when the search isn&apos;t enough to confirm or debunk.
          </li>
          <li>
            <strong>Don&apos;t use it as the only basis for a decision that matters.</strong>{' '}
            Not to accuse anyone, not for a news story, not for a legal, medical or financial
            decision. It&apos;s a starting point for looking more closely.
          </li>
        </Lista>
        <p>
          In legal terms: the service is provided &ldquo;as is&rdquo;, with no guarantee that a
          verdict is correct, complete or current, and we are not liable for decisions anyone
          makes based on an analysis.
        </p>
      </Seccion>

      <Seccion titulo="Your account">
        <Lista>
          <li>
            You need an account to analyze. Each analysis uses a real request to a paid model,
            and the account is what lets us keep the service free without it being abused.
          </li>
          <li>
            The details you give when signing up must be yours and true. You are responsible
            for what is done from your account.
          </li>
          <li>
            There is a limit of 20 new analyses per hour. It isn&apos;t a commercial
            restriction: it is the ceiling that keeps us from running out of budget.
          </li>
          <li>You must be 13 or older.</li>
        </Lista>
      </Seccion>

      <Seccion titulo="What you can't do">
        <Lista>
          <li>
            Use AletheIA to harass, defame or single out a specific person. Our analyses talk
            about the content, never about who shares it, and we expect the same from how they
            are used.
          </li>
          <li>
            Analyze content you access without permission, or upload screenshots of other
            people&apos;s conversations that aren&apos;t yours to share.
          </li>
          <li>
            Automate use of the service (scripts, bots, reselling the analyses) or try to get
            around the hourly limits.
          </li>
          <li>
            Present one of our verdicts as if it were a professional fact-check, or attribute to
            us a conclusion we didn&apos;t reach.
          </li>
        </Lista>
        <p>
          If any of this happens we may suspend the account. If it&apos;s serious, without
          prior notice.
        </p>
      </Seccion>

      <Seccion titulo="The content you analyze">
        <p>
          What you paste or capture still belongs to whoever owns it: we claim no rights over
          it. We only use it to produce the analysis you asked for. What is stored and what
          isn&apos;t is detailed in the{' '}
          <Link href="/privacidad" className="text-accent-text underline">
            privacy policy
          </Link>
          , and the part about content traveling to Google is worth reading.
        </p>
        <p>
          The analysis itself (the text of the verdict, the reasoning, the summary) is generated
          by us and you can share and quote it freely, as long as you mention it came from
          AletheIA.
        </p>
      </Seccion>

      <Seccion titulo="Availability">
        <p>
          This is a project in development, built by two people. It may be down, it may be
          slow, and we may change or discontinue features. If we ever decide to shut it down,
          we will give notice in advance so you can take your history with you.
        </p>
      </Seccion>

      <Seccion titulo="If these terms change">
        <p>
          We update the date above and let you know by email before it takes effect. If you
          don&apos;t agree with a change, you can close your account.
        </p>
      </Seccion>

      <Seccion titulo="Governing law">
        <p>
          These terms are governed by the laws of the Argentine Republic and any dispute will be
          settled before its ordinary courts.
        </p>
      </Seccion>

      <p className="text-body-sm text-muted">
        See also the{' '}
        <Link href="/privacidad" className="text-accent-text underline">
          privacy policy
        </Link>
        .
      </p>
    </article>
  )
}
