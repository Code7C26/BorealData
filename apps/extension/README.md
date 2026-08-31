# AletheIA — Extensión de Chrome

Scaffold inicial (Manifest V3 + React + TypeScript, con [WXT](https://wxt.dev)).

## Desarrollo

```bash
npm install
npm run dev
```

Esto abre una ventana de Chrome con la extensión ya cargada y HMR activo.

## Build

```bash
npm run build   # genera .output/chrome-mv3
npm run zip     # genera el .zip listo para subir a la Chrome Web Store
```

## Estado actual

- Popup funcional: precarga la URL de la pestaña activa y tiene el flujo de
  "Analizar" con estado de carga.
- **Pendiente:** conectar `handleAnalyze` en `entrypoints/popup/App.tsx` con
  el endpoint real del backend (Cloud Run) una vez esté definido el contrato.
- **Pendiente:** reemplazar los íconos de `public/icon/` por el logo de
  AletheIA (una vez tenga fondo transparente).
