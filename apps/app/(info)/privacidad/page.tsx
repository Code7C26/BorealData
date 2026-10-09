import type { Metadata } from 'next'
import Link from 'next/link'
import { EncabezadoLegal, Lista, Seccion } from '@/components/pagina-legal'

export const metadata: Metadata = {
  title: 'Política de privacidad — AletheIA',
  description:
    'Qué datos guarda AletheIA, qué no guarda, a dónde viaja lo que analizás y cómo pedir que se borren.',
}

/**
 * Política de privacidad.
 *
 * Está escrita contra el código, no contra lo que nos gustaría poder decir:
 * cada afirmación de acá se corresponde con una línea concreta del backend
 * (las rutas /analyze, /analyze/read, /analyze/content, /analyses/:id y el
 * esquema de la base). Si cambia el comportamiento, esta página cambia en el
 * mismo commit — una herramienta cuyo argumento es "mirá la evidencia" no
 * puede tener una promesa de privacidad desactualizada.
 */
export default function PrivacidadPage() {
  return (
    <article className="flex flex-col gap-8">
      <EncabezadoLegal
        volanta="Política de privacidad"
        titulo="Qué hacemos con tus datos"
        bajada="Sin letra chica. Abajo está, dato por dato, qué guardamos, qué no, a dónde viaja lo que analizás y cómo pedir que lo borremos."
        fecha="8 de octubre de 2026"
      />

      <Seccion titulo="Quiénes somos">
        <p>
          AletheIA es un producto de <strong>Boreal Data</strong>, un proyecto desarrollado por
          Renzo Lanata y Ciro Di Marsico. Para cualquier tema de datos personales escribinos a{' '}
          <a href="mailto:contacto@borealdata.com" className="text-accent-text underline">
            contacto@borealdata.com
          </a>
          .
        </p>
      </Seccion>

      <Seccion titulo="Qué guardamos">
        <p>Tres cosas, y nada más que estas tres:</p>
        <Lista>
          <li>
            <strong>Tu cuenta.</strong> Tu correo electrónico y el identificador que le asigna
            Firebase Authentication, más tu nombre y apellido si elegís completarlos en tu
            perfil. La contraseña no pasa por nuestros servidores: la maneja Firebase.
          </li>
          <li>
            <strong>Los análisis que pedís.</strong> El enlace que analizaste, el título de la
            nota, el veredicto, el nivel de confianza, el titular, el resumen, los pasos del
            razonamiento, las fuentes consultadas, las señales de tono y la fecha. Queda
            asociado a tu cuenta para que puedas verlo en tu historial.
          </li>
          <li>
            <strong>De dónde salió una captura.</strong> Cuando analizás algo que no es un
            enlace (una captura de pantalla, un texto seleccionado, un texto pegado) guardamos
            el tipo de contenido, la plataforma si la detectamos, y la dirección de la página
            en la que estabas — <em>sin</em> la parte que va después de{' '}
            <code className="font-mono text-caption">?</code> o{' '}
            <code className="font-mono text-caption">#</code>, que es donde suelen viajar los
            tokens de sesión.
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="Qué NO guardamos">
        <Lista>
          <li>
            <strong>Las imágenes que mandás.</strong> Una captura de pantalla existe solo en
            memoria durante el tiempo que tarda en leerse, y se descarta cuando termina esa
            consulta. No se escribe en disco, no entra a la base y no queda en los registros.
          </li>
          <li>
            <strong>El texto del contenido privado.</strong> Cuando verificás una captura, una
            selección o un texto pegado, guardamos el <em>análisis</em> (el veredicto, el
            razonamiento, las fuentes) pero no el texto original.
          </li>
          <li>
            <strong>Tu contraseña.</strong> Nunca la vemos.
          </li>
          <li>
            <strong>Nada de publicidad ni de seguimiento.</strong> No usamos Google Analytics,
            ni píxeles, ni cookies de terceros. No vendemos ni cedemos datos a nadie, y no hay
            un modelo de negocio detrás que dependa de eso.
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="Lo que analizás viaja a Google">
        <p>
          Esto es lo más importante de entender, y es inherente a cómo funciona la
          herramienta: para verificar algo, el contenido (el texto de la nota, o lo que leímos
          de tu captura) se envía a la <strong>API de Gemini de Google</strong>, que además
          hace búsquedas en Google para contrastar la información contra otras fuentes.
        </p>
        <p>
          O sea:{' '}
          <strong>no analices con AletheIA algo que no quieras que pase por Google.</strong> Si
          verificás la captura de una conversación privada, el texto de esa conversación llega
          a los servidores de Google aunque nosotros no lo guardemos. El uso que Google le da a
          esos datos se rige por sus propios términos, no por los nuestros.
        </p>
        <p>
          La infraestructura también es de Google: la aplicación corre en Cloud Run, la base de
          datos es Cloud SQL y las cuentas las maneja Firebase Authentication.
        </p>
      </Seccion>

      <Seccion titulo="Qué puede ver otra gente">
        <Lista>
          <li>
            <strong>Los análisis de enlaces son compartibles.</strong> Cuando usás
            &ldquo;Compartir verificación&rdquo;, el enlace que se copia muestra ese análisis a
            cualquiera que lo abra, sin necesidad de cuenta. No aparece tu correo ni tu nombre,
            pero sí la nota que analizaste. Compartilo solo con quien quieras.
          </li>
          <li>
            <strong>Las capturas y los textos no son compartibles.</strong> Un análisis que no
            salió de un enlace público se lo servimos únicamente a tu cuenta. No hay enlace
            para compartirlo y el botón no aparece.
          </li>
          <li>
            <strong>Reutilizamos análisis de enlaces entre cuentas.</strong> Si analizás una
            nota que otra persona ya analizó, te mostramos ese análisis en vez de gastar una
            consulta nueva. Eso no le cuenta a nadie que vos la analizaste, y{' '}
            <strong>nunca</strong> pasa con capturas ni textos pegados.
          </li>
          <li>
            <strong>Los números de la página de inicio son totales agregados.</strong> Cuántas
            notas se analizaron, cuántas fuentes se consultaron y el promedio de confianza. No
            se puede llegar a una persona desde ahí.
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="Cuánto tiempo lo guardamos">
        <p>
          Tus análisis quedan en tu historial hasta que los borres, y podés borrarlos de a uno
          desde el historial o todos juntos desde Configuración. Si borrás tu cuenta, se borran
          tu usuario y todos tus análisis.
        </p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>
          La Ley 25.326 de Protección de los Datos Personales te da derecho a acceder a tus
          datos, a corregirlos y a pedir que se borren, gratis. Lo primero y lo último podés
          hacerlo vos desde Configuración; para cualquier otra cosa escribinos a{' '}
          <a href="mailto:contacto@borealdata.com" className="text-accent-text underline">
            contacto@borealdata.com
          </a>{' '}
          desde el correo de tu cuenta y te respondemos dentro de 10 días hábiles.
        </p>
        <p className="text-caption text-subtle">
          La Agencia de Acceso a la Información Pública es el organismo de control de esa ley y
          atiende las denuncias de quien considere que sus derechos fueron afectados.
        </p>
      </Seccion>

      <Seccion titulo="Menores de edad">
        <p>
          AletheIA no está pensada para menores de 13 años y no les pedimos datos a sabiendas.
          Si sos madre, padre o tutor y creés que tenemos datos de un chico, escribinos y los
          borramos.
        </p>
      </Seccion>

      <Seccion titulo="Si esto cambia">
        <p>
          Si cambiamos algo de fondo, actualizamos la fecha de arriba y te avisamos por correo
          antes de que entre en vigencia. El historial de cambios de esta página está en el
          repositorio público del proyecto.
        </p>
      </Seccion>

      <p className="text-body-sm text-muted">
        Ver también los{' '}
        <Link href="/terminos" className="text-accent-text underline">
          términos y condiciones
        </Link>
        .
      </p>
    </article>
  )
}
