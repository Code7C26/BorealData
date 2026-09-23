# AletheIA — Extensión de Chrome

Manifest V3 + React + TypeScript, con [WXT](https://wxt.dev). Es un **side
panel** (`chrome.sidePanel`), no un popup — se ancla a la derecha y no se
cierra al perder foco, igual que la extensión de Claude. Entrypoint:
`entrypoints/sidepanel/`.

## Desarrollo

```bash
npm install
npm run dev
```

Esto compila con hot-reload en `apps/extension/.output/chrome-mv3-dev`.
Cargarla como "unpacked" en `chrome://extensions` apuntando a esa carpeta.

Si se toca `entrypoints/background.ts`, hay que recargar la extensión a mano
en `chrome://extensions` — el service worker no tiene hot-reload.

## Build

```bash
npm run build   # genera .output/chrome-mv3
npm run zip     # genera el .zip listo para subir a la Chrome Web Store
```

## Estado actual

- Side panel funcional: precarga la URL de la pestaña activa, analiza y
  muestra el resultado (`ResultView.tsx`) con el mismo vocabulario de
  veredictos que la web (`verificado` / `dudoso` / `falso` / `sin-datos` +
  confianza 1-5).
- "Ver análisis completo" abre `${WEB_ORIGIN}/resultado/{id}` (la vista
  pública sin login del análisis puntual); si el guardado no devolvió id,
  cae a `${WEB_ORIGIN}/historial`.
- Comparte sesión con la web vía `extension-bridge.ts` (Firebase Auth).
- Íconos en `public/icon/` ya son el logo de AletheIA (isotipo "Umbral").

## Gotcha: cerrar el side panel

`chrome.sidePanel.close()` llamado desde el propio panel no cierra nada
(resuelve la promesa pero no hace nada visible). Tiene que llamarse **desde
`entrypoints/background.ts`**, en respuesta a un evento como
`tabs.onActivated` — a diferencia de `open()`, `close()` no requiere un
gesto directo del usuario.
