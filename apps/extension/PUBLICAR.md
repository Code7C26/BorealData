# Publicación en la Chrome Web Store

Procedimiento para publicar la extensión. La revisión de Google es manual y suele
demorar de 1 a 3 días hábiles; puede extenderse cuando el manifest declara permisos
amplios como `*://*/*`.

## 1. Paquete

En `apps/extension/`:

1. Crear `.env.production` (no se versiona; ver `.env.example`):

   ```
   WXT_API_URL=https://aletheiainc.online/api
   WXT_WEB_ORIGIN=https://aletheiainc.online
   WXT_FIREBASE_API_KEY=<misma clave que en .env>
   ```

2. Incrementar `version` en `package.json`: la tienda rechaza un paquete con la misma
   versión que el anterior.
3. `npm run zip` genera `.output/aletheia-extension-<version>-chrome.zip`.
4. Probar el build: `chrome://extensions` → "Cargar descomprimida" →
   `.output/chrome-mv3`, iniciar sesión en https://aletheiainc.online y analizar un
   enlace desde el panel.

## 2. Cuenta de desarrollador

- https://chrome.google.com/webstore/devconsole (pago único de USD 5).
- La cuenta titular es la propietaria de la extensión; otros miembros pueden sumarse
  mediante un *grupo de editores*.
- El email de contacto debe verificarse. Si se publica como empresa, se requiere además
  la verificación de "trader".

## 3. Firebase: autorizar la extensión

La API key de Firebase está restringida por HTTP referrer. La extensión renueva el token
desde `chrome-extension://<ID>`; sin este paso, la sesión expira con el primer token
(aproximadamente una hora).

1. Tras la primera subida (incluso como borrador), la consola muestra el **ID** de la
   extensión (32 caracteres).
2. Google Cloud Console → APIs y servicios → Credenciales → API key web → Restricciones
   de sitios web → agregar `chrome-extension://<ID>/*`.

## 4. Ficha de la tienda

| Campo | Valor |
| --- | --- |
| Nombre | AletheIA (definido en `_locales`) |
| Resumen | Definido en `_locales` (máximo 132 caracteres) |
| Categoría | Herramientas (o "Noticias y tiempo") |
| Idioma | Español, con descripción traducida al inglés |
| Sitio web | https://aletheiainc.online |
| Soporte | https://aletheiainc.online/contacto |

**Descripción:**

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

- Ícono 128×128: `public/icon/128.png`.
- Capturas: de 1 a 5, de 1280×800 (o 640×400): panel con un veredicto, menú contextual
  y recorte de una captura en una red social. Las piezas listas para subir están en
  `store/`.
- Mosaico promocional de 440×280 (obligatorio); el de 1400×560 es opcional.

## 5. Prácticas de privacidad

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

**Código remoto:** no se usa.

**Datos que se recopilan:**

- Información de identificación personal: el email de la cuenta.
- Información de autenticación: token de sesión de Firebase.
- Contenido del sitio web: texto, imágenes y URL que el usuario envía a analizar.

Se marcan además las tres certificaciones: los datos no se venden a terceros, no se usan
para fines ajenos al propósito único y no se usan para evaluar crédito.

**Política de privacidad:** https://aletheiainc.online/privacidad

## 6. Distribución

- Visibilidad: **Pública**, o **No listada** para una primera etapa de pruebas (solo se
  instala con el enlace).
- Países: todos.
- "Enviar para revisión", con la opción de publicar automáticamente al aprobarse.

## Actualizaciones

Incrementar `version`, ejecutar `npm run zip` y, en la consola, Paquete → Subir nuevo
paquete → Enviar para revisión. La actualización se distribuye automáticamente en unas
horas.
