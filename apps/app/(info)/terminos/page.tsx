import type { Metadata } from 'next'
import Link from 'next/link'
import { EncabezadoLegal, Lista, Seccion } from '@/components/pagina-legal'

export const metadata: Metadata = {
  title: 'Términos y condiciones — AletheIA',
  description:
    'Qué es AletheIA, qué no es, qué podés esperar de un veredicto y cuáles son las reglas de uso.',
}

/**
 * Términos y condiciones.
 *
 * El apartado que importa de verdad es "Qué es y qué no es un veredicto": una
 * herramienta de verificación automática que no aclara sus propios límites se
 * contradice a sí misma. Va arriba por eso, antes de las reglas de uso.
 */
export default function TerminosPage() {
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
