# Publicar en la Chrome Web Store

Checklist para subir la extensión. El paquete se arma solo; lo que lleva
trabajo es la ficha de la tienda y la pestaña de privacidad, que Google
revisa a mano (suele tardar de 1 a 3 días hábiles, más si pide `*://*/*`).

## 1. Armar el .zip

En `apps/extension/`:

1. Tener `.env.production` (no se commitea; ver `.env.example`):

   ```
   WXT_API_URL=https://aletheiainc.online/api
   WXT_WEB_ORIGIN=https://aletheiainc.online
   WXT_FIREBASE_API_KEY=<la misma de .env>
   ```

2. Subir `version` en `package.json` (la tienda rechaza un zip con la misma
   versión que el anterior).
3. `npm run zip` → `.output/aletheia-extension-<version>-chrome.zip`.
4. Antes de subirlo, probarlo: `chrome://extensions` → "Cargar descomprimida"
   → `.output/chrome-mv3`. Loguearse en https://aletheiainc.online y analizar
   un link desde el panel.

## 2. Cuenta de desarrollador

- https://chrome.google.com/webstore/devconsole — pago único de USD 5.
- Conviene una cuenta de Google de la empresa (no personal): el dueño de la
  cuenta es el dueño de la extensión. Se pueden sumar miembros con un
  *grupo de editores*.
- Completar el email de contacto (hay que verificarlo) y, si se publica como
  empresa, la verificación de "trader" con los datos de Boreal Data.

## 3. Firebase: autorizar la extensión (importante)

La API key de Firebase está restringida por *HTTP referrer*. La extensión
refresca el token desde `chrome-extension://<ID>`, así que sin esto la sesión
se cae al vencer el primer token (~1 h).

1. Después de la primera subida (aunque sea borrador) la consola muestra el
   **ID** de la extensión (32 letras).
2. Google Cloud Console → APIs y servicios → Credenciales → la API key web →
   Restricciones de sitios web → agregar `chrome-extension://<ID>/*`.

## 4. Ficha de la tienda (Store listing)

| Campo | Valor |
| --- | --- |
| Nombre | AletheIA (sale de `_locales`) |
| Resumen | sale de `_locales` (máx. 132 caracteres) |
| Categoría | Herramientas (o "Noticias y tiempo") |
| Idioma | Español; agregar Inglés con la descripción traducida |
| Sitio web | https://aletheiainc.online |
| Soporte | https://aletheiainc.online/contacto |

**Descripción (borrador):**

> AletheIA te dice si lo que estás leyendo es confiable. Abrí el panel lateral
> en cualquier nota, posteo o imagen y en segundos tenés un veredicto
> —verificado, dudoso, falso o sin datos— con su nivel de confianza, las
> fuentes que lo respaldan o contradicen y el razonamiento paso a paso.
>
> • Analizá el link de la pestaña con un clic.
> • Clic derecho sobre una imagen, un texto seleccionado o la página:
>   "Analizar con AletheIA".
> • Capturá lo que ves en redes (Facebook, Instagram, X, TikTok, WhatsApp
>   Web), incluso contenido que necesita login.
> • Tu historial queda guardado en tu cuenta de aletheiainc.online.
>
> Necesitás una cuenta de AletheIA.

**Imágenes** (PNG o JPG):

- Ícono 128×128: ya está (`public/icon/128.png`).
- Capturas: al menos 1, hasta 5, de **1280×800** (o 640×400). Sugeridas:
  panel con un veredicto, menú del clic derecho, recorte de captura en una red.
- Mosaico promocional chico 440×280 (obligatorio). El de 1400×560 es opcional.

## 5. Prácticas de privacidad (Privacy practices)

**Propósito único:**

> Verificar la veracidad de noticias y contenidos que el usuario está viendo,
> devolviendo un veredicto con fuentes.

**Justificación de permisos:**

| Permiso | Justificación |
| --- | --- |
| `activeTab` | Leer la URL y capturar la pestaña actual solo cuando el usuario toca "Analizar" o usa el menú contextual. |
| `sidePanel` | La interfaz de la extensión es un panel lateral que queda abierto mientras el usuario navega. |
| `storage` | Guardar localmente la sesión iniciada en la web y el idioma elegido. |
| `contextMenus` | Ítem "Analizar con AletheIA" al hacer clic derecho sobre una imagen, una selección o la página. |
| Host `aletheiainc.online/api` | Enviar el contenido elegido por el usuario al backend de AletheIA para analizarlo. |
| Host `securetoken.googleapis.com` | Renovar el token de sesión de Firebase Authentication. |
| Hosts de redes sociales | Capturar lo que el usuario ve en esas redes cuando pide analizarlo: el servidor no puede leer ese contenido porque está detrás de un login. |
| Opcional `*://*/*` | Se pide en el momento y por sitio, solo si el usuario quiere capturar una página fuera de las redes listadas. |
| Content script en aletheiainc.online | Recibir la sesión del usuario cuando inicia sesión en la web, para no pedir un login aparte en la extensión. |

**¿Usa código remoto?** No.

**Datos que se recopilan** (tildar):

- Información de identificación personal → el email de la cuenta.
- Información de autenticación → token de sesión de Firebase.
- Contenido del sitio web → texto, imágenes y URL que el usuario manda a analizar.

Y las tres certificaciones (no se venden datos a terceros, no se usan para
otra cosa que el propósito único, no se usan para crédito/préstamos).

**URL de la política de privacidad:** https://aletheiainc.online/privacidad

## 6. Distribución y envío

- Visibilidad: **Pública**, o **No listada** para una primera tanda de
  pruebas (solo se instala con el link).
- Países: todos.
- "Enviar para revisión". Se puede tildar "publicar automáticamente al
  aprobarse".

## Actualizaciones

Subir `version`, `npm run zip` y en la consola: Paquete → Subir nuevo
paquete → Enviar para revisión. Los usuarios la reciben solos en unas horas.
