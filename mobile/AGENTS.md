# AletheIA — app móvil

App de AletheIA (Boreal Data). Pega contra `backend/` y comparte cuenta,
proyecto de Firebase e historial con la web de `apps/`.

**Antes de tocar nada, leer `README.md` de esta carpeta**: tiene cómo correrla,
las decisiones tomadas y las trampas que ya nos costaron tiempo.

Reglas propias de este proyecto, además de las de Expo que siguen abajo:

- `src/lib/verdict.ts` y `src/lib/api.ts` son **espejos** de `apps/lib/`. Si
  cambia el contrato del análisis, se cambian los dos (y `backend/src/gemini/types.ts`).
- Ningún componente escribe un hex ni un número de radio suelto: todo sale de
  `src/theme/tokens.ts` (roles semánticos del Design System V1).
- El veredicto nunca es color solo: siempre color + ícono + etiqueta.
- El fondo se anima siempre, incluso con "reducir movimiento" activado. Es una
  decisión de diseño tomada, no un descuido (de ahí los `ReduceMotion.Never`).
- Los textos de interfaz van en los DOS idiomas, en un `traducciones({ es, en })`
  al lado de cada pantalla (`src/lib/idioma.ts`, espejo de `apps/lib/idioma.ts`).
  El castellano es rioplatense ("verificá", "pegá") y es el canónico: TypeScript
  obliga a que la versión en inglés tenga exactamente la misma forma.

---

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
