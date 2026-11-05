# AletheIA — Extensión de Chrome

Manifest V3, React y TypeScript sobre [WXT](https://wxt.dev). La interfaz es un side
panel (`chrome.sidePanel`) que permanece abierto mientras se navega.

## Desarrollo

```bash
npm install
cp .env.example .env
npm run dev
```

La salida queda en `.output/chrome-mv3-dev` y se carga como extensión sin empaquetar en
`chrome://extensions`. Los cambios en `entrypoints/background.ts` requieren recargar la
extensión manualmente: el service worker no tiene hot reload.

## Build

```bash
npm run build      # .output/chrome-mv3
npm run zip        # paquete para la Chrome Web Store
npm run compile    # chequeo de tipos
```

El build lee `.env` y `.env.production`. Los permisos de host del manifest se derivan de
`WXT_API_URL` y `WXT_WEB_ORIGIN`. El procedimiento de publicación está en
[PUBLICAR.md](PUBLICAR.md).

## Estructura

| Archivo | Responsabilidad |
|---|---|
| `entrypoints/background.ts` | Análisis, menú contextual, captura con recorte y cierre del panel. |
| `entrypoints/auth-bridge.content.ts` | Recibe la sesión iniciada en la web. |
| `entrypoints/sidepanel/` | Interfaz: análisis, recorte, revisión de la lectura y resultado. |
| `lib/analysis.ts` | Tipos y llamadas a la API. |
| `lib/capture.ts` | Captura de la pestaña y procesamiento de imágenes. |
| `lib/platform.ts` | Detección de redes sociales con sesión. |
| `lib/idioma.ts` | Textos en castellano e inglés. |
| `public/_locales/` | Nombre y descripción localizados del manifest. |

## Funcionamiento

- El panel precarga la URL de la pestaña activa y muestra el resultado con el mismo
  vocabulario de veredictos que la web.
- En sitios con login, el contenido se envía como captura o selección mediante
  `POST /analyze/read` y `POST /analyze/content` (ver `DOCS/ARQUITECTURA.md`).
- "Ver análisis completo" abre `${WEB_ORIGIN}/resultado/{id}`; si el análisis no se
  guardó, abre `${WEB_ORIGIN}/historial`.

## Cierre del side panel

`chrome.sidePanel.close()` no tiene efecto si se llama desde el propio panel. Se invoca
desde `background.ts` en respuesta a eventos como `tabs.onActivated`; a diferencia de
`open()`, no requiere un gesto del usuario.
