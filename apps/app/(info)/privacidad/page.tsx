import type { Metadata } from 'next'
import Link from 'next/link'
import { EncabezadoLegal, Lista, Seccion } from '@/components/pagina-legal'
import { traducciones } from '@/lib/idioma'
import { leerIdioma } from '@/lib/idioma-servidor'

const METADATA = traducciones<Metadata>({
  es: {
    title: 'Política de privacidad — AletheIA',
    description:
      'Qué datos guarda AletheIA, qué no guarda, a dónde viaja lo que analizás y cómo pedir que se borren.',
  },
  en: {
    title: 'Privacy policy — AletheIA',
    description:
      "What data AletheIA stores, what it doesn't, where what you analyze travels and how to ask for it to be deleted.",
  },
})

export async function generateMetadata(): Promise<Metadata> {
  return METADATA[await leerIdioma()]
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
 *
 * Son dos textos enteros y no un diccionario de frases: la página es casi toda
 * marcado (negritas, enlaces, código) y partirla en claves la haría ilegible en
 * los dos idiomas. Si cambia una, cambia la otra en el mismo commit.
 */
export default async function PrivacidadPage() {
  return (await leerIdioma()) === 'en' ? <ContenidoEn /> : <ContenidoEs />
}

function ContenidoEs() {
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

function ContenidoEn() {
  return (
    <article className="flex flex-col gap-8">
      <EncabezadoLegal
        volanta="Privacy policy"
        titulo="What we do with your data"
        bajada="No fine print. Below is, item by item, what we store, what we don't, where what you analyze travels and how to ask us to delete it."
        fecha="October 8, 2026"
        etiquetaFecha="Last updated"
      />

      <p className="max-w-texto text-caption text-subtle">
        This is a translation provided for convenience. If there is any discrepancy, the
        Spanish version of this policy prevails.
      </p>

      <Seccion titulo="Who we are">
        <p>
          AletheIA is a product of <strong>Boreal Data</strong>, a project developed by Renzo
          Lanata and Ciro Di Marsico. For anything related to personal data, write to us at{' '}
          <a href="mailto:contacto@borealdata.com" className="text-accent-text underline">
            contacto@borealdata.com
          </a>
          .
        </p>
      </Seccion>

      <Seccion titulo="What we store">
        <p>Three things, and nothing but these three:</p>
        <Lista>
          <li>
            <strong>Your account.</strong> Your email address and the identifier Firebase
            Authentication assigns to it, plus your first and last name if you choose to fill
            them in on your profile. Your password never goes through our servers: Firebase
            handles it.
          </li>
          <li>
            <strong>The analyses you request.</strong> The link you analyzed, the title of the
            article, the verdict, the confidence level, the headline, the summary, the reasoning
            steps, the sources checked, the tone signals and the date. It is tied to your account
            so you can see it in your history.
          </li>
          <li>
            <strong>Where a screenshot came from.</strong> When you analyze something that
            isn&apos;t a link (a screenshot, selected text, pasted text) we store the type of
            content, the platform if we detect it, and the address of the page you were on —{' '}
            <em>without</em> the part after the{' '}
            <code className="font-mono text-caption">?</code> or{' '}
            <code className="font-mono text-caption">#</code>, which is where session tokens
            usually travel.
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="What we DON'T store">
        <Lista>
          <li>
            <strong>The images you send.</strong> A screenshot only exists in memory for as long
            as it takes to read it, and is discarded when that request ends. It isn&apos;t
            written to disk, doesn&apos;t go into the database and doesn&apos;t stay in the
            logs.
          </li>
          <li>
            <strong>The text of private content.</strong> When you check a screenshot, a
            selection or pasted text, we store the <em>analysis</em> (the verdict, the
            reasoning, the sources) but not the original text.
          </li>
          <li>
            <strong>Your password.</strong> We never see it.
          </li>
          <li>
            <strong>No advertising or tracking.</strong> We don&apos;t use Google Analytics,
            pixels or third-party cookies. We don&apos;t sell or hand over data to anyone, and
            there is no business model behind this that depends on it.
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="What you analyze travels to Google">
        <p>
          This is the most important thing to understand, and it is inherent to how the tool
          works: to check something, the content (the text of the article, or what we read
          from your screenshot) is sent to <strong>Google&apos;s Gemini API</strong>, which
          also runs Google searches to cross-check the information against other sources.
        </p>
        <p>
          In other words:{' '}
          <strong>
            don&apos;t analyze anything with AletheIA that you don&apos;t want to go through
            Google.
          </strong>{' '}
          If you check a screenshot of a private conversation, the text of that conversation
          reaches Google&apos;s servers even though we don&apos;t store it. Google&apos;s use
          of that data is governed by its own terms, not ours.
        </p>
        <p>
          The infrastructure is also Google&apos;s: the application runs on Cloud Run, the
          database is Cloud SQL and accounts are handled by Firebase Authentication.
        </p>
      </Seccion>

      <Seccion titulo="What other people can see">
        <Lista>
          <li>
            <strong>Link analyses can be shared.</strong> When you use &ldquo;Share this
            check&rdquo;, the copied link shows that analysis to anyone who opens it, no account
            needed. Your email and name don&apos;t appear, but the article you analyzed does.
            Only share it with people you want to.
          </li>
          <li>
            <strong>Screenshots and texts can&apos;t be shared.</strong> An analysis that
            didn&apos;t come from a public link is only served to your account. There is no
            link to share it and the button doesn&apos;t appear.
          </li>
          <li>
            <strong>We reuse link analyses across accounts.</strong> If you analyze an article
            someone else already analyzed, we show you that analysis instead of spending a new
            request. That doesn&apos;t tell anyone that you analyzed it, and it{' '}
            <strong>never</strong> happens with screenshots or pasted texts.
          </li>
          <li>
            <strong>The numbers on the home page are aggregate totals.</strong> How many
            articles were analyzed, how many sources were checked and the average confidence.
            No one can be traced from there.
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="How long we keep it">
        <p>
          Your analyses stay in your history until you delete them, and you can delete them one
          by one from your history or all at once from Settings. If you delete your account,
          your user and all your analyses are deleted.
        </p>
      </Seccion>

      <Seccion titulo="Your rights">
        <p>
          Argentina&apos;s Personal Data Protection Law 25.326 gives you the right to access
          your data, to correct it and to ask for it to be deleted, free of charge. You can do
          the first and the last yourself from Settings; for anything else write to us at{' '}
          <a href="mailto:contacto@borealdata.com" className="text-accent-text underline">
            contacto@borealdata.com
          </a>{' '}
          from your account&apos;s email and we will reply within 10 business days.
        </p>
        <p className="text-caption text-subtle">
          The Agency for Access to Public Information is the authority that enforces that law
          and handles complaints from anyone who believes their rights have been affected.
        </p>
      </Seccion>

      <Seccion titulo="Minors">
        <p>
          AletheIA isn&apos;t meant for children under 13 and we don&apos;t knowingly ask them
          for data. If you are a parent or guardian and believe we have a child&apos;s data,
          write to us and we will delete it.
        </p>
      </Seccion>

      <Seccion titulo="If this changes">
        <p>
          If we change anything substantial, we update the date above and let you know by
          email before it takes effect. The change history of this page is in the
          project&apos;s public repository.
        </p>
      </Seccion>

      <p className="text-body-sm text-muted">
        See also the{' '}
        <Link href="/terminos" className="text-accent-text underline">
          terms and conditions
        </Link>
        .
      </p>
    </article>
  )
}
