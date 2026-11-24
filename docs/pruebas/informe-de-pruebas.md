# Informe de pruebas — AletheIA

Etapa 6 del proyecto: pruebas, testeo y resolución de errores. Registra cómo se probó el
sistema, qué errores aparecieron y cómo se resolvieron.

> Las secciones marcadas con **[completar]** las tiene que llenar el equipo: son datos
> que no están en el repositorio, como el testing cruzado con otros grupos o las capturas.

---

## 1. Estrategias de testeo

| Estrategia | Cómo se aplicó |
|---|---|
| Tests automatizados | Vitest en el backend y en la web. Se corren antes de cada pull request (`npm test`) junto con el chequeo de tipos y el lint |
| Pruebas manuales | Cada funcionalidad nueva se probó en la web, la extensión y el celular antes de mergear, con análisis reales de noticias |
| Medición en el navegador | Los bugs visuales se confirmaron midiendo el DOM (`getBoundingClientRect`, estilos calculados) en lugar de comparar capturas a ojo, que dio falsos positivos |
| Testing cruzado | **[completar]** Qué grupo probó AletheIA, qué casos usaron y qué encontraron |
| Usuarios reales | **[completar]** Feedback de usuarios de la web o la extensión (encuestas, comentarios, feria) |

### Tests automatizados

146 casos en total: 124 en el backend y 22 en la web.

| Archivo | Casos | Qué cubre |
|---|---|---|
| `backend/src/gemini/geminiClient.test.ts` | 35 | Parseo de la respuesta de Gemini, fuentes reales de `groundingChunks`, JSON tolerante |
| `backend/src/utils/sanitize.test.ts` | 19 | Sanitización del contenido que entra al análisis |
| `backend/src/plan/cupo.test.ts` | 18 | Cupo diario (Gratuito) y mensual (Premium) |
| `backend/src/utils/validateUrl.test.ts` | 14 | Defensa contra SSRF: IPs privadas, esquemas y puertos no permitidos |
| `backend/src/routes/mercadoPago.test.ts` | 12 | Webhook de Mercado Pago y firma |
| `backend/src/auth/passwordResetCodes.test.ts` | 8 | Códigos de recuperación de contraseña |
| `backend/src/scraper/extractArticle.test.ts` | 7 | Extracción del cuerpo real de la nota |
| `backend/src/gemini/idiomaSalida.test.ts` | 5 | Idioma de salida del análisis (castellano o inglés) |
| `backend/src/gemini/types.test.ts` | 4 | Normalización del veredicto y la confianza |
| `backend/src/utils/analyzeLimiter.test.ts` | 2 | Rate limit por usuario |
| `apps/lib/verdict.test.ts` | 13 | Vocabulario y combinaciones válidas de veredicto y confianza |
| `apps/lib/fuentes.test.ts` | 5 | Separación de fuentes con y sin enlace |
| `apps/lib/plan.test.ts` | 4 | Redirección al checkout y cupo agotado |

Comandos:

```bash
cd backend && npm test
cd apps && npm test
```

**[completar]** Captura de la salida de los tests pasando.

---

## 2. Errores encontrados y cómo se resolvieron

| # | Error | Causa | Solución |
|---|---|---|---|
| 1 | El historial aparecía vacío y el link de compartir no llevaba a nada (sep-2026) | El código se había mergeado sin correr la migración de la base: faltaban columnas y las consultas fallaban en silencio | Migraciones idempotentes en `backend/migrate*.ts`. Antes de depurar el front, se revisa el esquema |
| 2 | Al usar la extensión se cerraba la sesión de la web | La sesión se guardaba por pestaña y la pestaña nueva avisaba un "logout" a la extensión | Sesión persistente por defecto y el puente solo avisa el cierre si hubo una sesión real antes |
| 3 | Casi ninguna fuente del resultado tenía enlace (medido: 44 de 430) | El cruce con las fuentes de Google Search comparaba contra el dominio de una URL de redirección, que es igual para todas | El cruce se hace contra el dominio real del medio (`web.title`); las fuentes sin enlace se muestran aparte |
| 4 | "Compartir resultado" no daba ninguna señal al tocarlo | No había feedback visual | El botón cambia a "¡Enlace copiado!" y no lo dice si la copia falló |
| 5 | El link compartido solo funcionaba en el navegador propio | El resultado vivía en `sessionStorage` | Página pública `/resultado/:id` servida por el backend |
| 6 | El botón "Volver al historial" no quedaba fijo al scrollear | Un `overflow: hidden` en el contenedor del sidebar anulaba `position: sticky` | Se quitó el `overflow` del contenedor raíz |
| 7 | El análisis de tipo "pregunta" no se guardaba en producción | La base del servidor no tenía `question` como tipo válido | Migración `migrate-question.ts` |
| 8 | El backend en Docker respondía 401 en todas las rutas | Faltaban `FIREBASE_PROJECT_ID` y las variables de Gemini en el servicio | Se agregaron al `docker-compose.yml` y al `.env.example` |
| 9 | Las capturas no se leían en Docker | La variable del modelo de lectura llegaba vacía | Valor por defecto cuando `GEMINI_READ_MODEL` está vacía |
| 10 | El muro de notas de la portada quedaba vacío a mitad de la animación | La altura del contenedor deformaba el desplazamiento del loop | El contenedor mide lo que miden sus hijos y el juego de notas es más alto que la sección |

**[completar]** Capturas del antes y el después de los errores más visibles (2, 3, 4 y 6).

---

## 3. Cambios realizados luego del feedback

**[completar]** Cambios que salieron de comentarios de usuarios, docentes u otros grupos. El
registro de lo que se cambió después de la feria está en
[`../seguimiento/mejoras-post-feria.md`](../seguimiento/mejoras-post-feria.md).
