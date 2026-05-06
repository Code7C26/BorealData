# Análisis de Viabilidad — AletheIA

**Empresa:** Boreal Data  
**Producto:** AletheIA — Detector de noticias falsas con IA  
**Equipo:** 2 integrantes  
**Fecha:** Mayo 2026  
**Etapa:** 1 — Definición del proyecto  

---

## 1. Viabilidad Técnica

### Motor de Inteligencia Artificial

AletheIA **no requiere entrenar un modelo de IA propio desde cero.** Esta decisión es clave para la viabilidad del proyecto. Entrenar un modelo especializado en detección de fake news es un problema de investigación universitaria que equipos con financiamiento y años de trabajo aún no han resuelto completamente.

En cambio, el stack del proyecto contempla el uso de **APIs de IA existentes** (Claude, Gemini, GPT) como motor central del análisis. Esto permite:

- Obtener análisis de texto de alta calidad desde el primer día.
- Escalar el sistema sin necesidad de infraestructura de entrenamiento.
- Enfocarse en la lógica del producto (scraping, verificación de fuentes, presentación de resultados) en lugar de en la ciencia del modelo.

### Componentes y su viabilidad estimada

| Componente | Tecnología | Viabilidad | Observaciones |
|---|---|---|---|
| Backend API | Python + FastAPI | ✅ Alta | Dominio técnico consolidado en el equipo |
| Scraping web | BeautifulSoup / Playwright | ✅ Alta | BeautifulSoup para MVP, Playwright como mejora posterior |
| Motor IA | Claude / Gemini / GPT API | ✅ Alta | APIs bien documentadas, sin necesidad de entrenamiento |
| Verificador de fuentes | MediaBias + lista propia | ✅ Alta | MediaBias tiene API pública accesible |
| Base de datos | PostgreSQL + Supabase | ✅ Alta | Supabase es de las plataformas más simples de implementar |
| Autenticación | Supabase + JWT | ✅ Alta | Integrado con la base de datos |
| Frontend web | Expo (TypeScript) + Vercel | ✅ Media-Alta | Expo export a web es estable, Vercel simplifica el deploy |
| App mobile | ExpoGo + EAS Build | ⚠️ Media | Requiere tiempo de desarrollo y testing en dispositivo real |
| Extensión Chrome | Manifest V3 + wrapper JS | ⚠️ Media-Baja | Componente más complejo técnicamente, mayor riesgo de retrasos |

### Riesgos técnicos identificados

- **Extensión de Chrome:** El Manifest V3 tiene restricciones de seguridad estrictas que pueden generar dificultades al comunicarse con el backend. Es el componente de mayor riesgo técnico.
- **Scraping:** Algunos sitios de noticias bloquean scrapers automáticos. Playwright como alternativa potente mitiga este riesgo.
- **APIs de IA externas:** Cambios en precios o disponibilidad de las APIs pueden afectar el funcionamiento. Tener más de una API en el stack (Claude, Gemini, GPT) como alternativas reduce este riesgo.

---

## 2. Viabilidad Temporal

El proyecto tiene fecha límite de presentación en la **primera semana de diciembre de 2026**, siguiendo el cronograma de 10 etapas establecido por la institución.

### Cronograma estimado por componente

| Mes | Etapa institucional | Foco de desarrollo |
|---|---|---|
| Mayo | Etapa 1 — Definición | Documentación, FODA, análisis de mercado, backlog inicial |
| Junio | Etapa 2 — Desarrollo | Setup del repositorio, backend base, integración API de IA |
| Julio | Etapa 2 — Desarrollo | Scraper funcional + verificador de fuentes + primeras pruebas |
| Agosto | Etapas 3 y 4 — Retoma y mejora | Frontend web operativo, MVP funcional, refactorización |
| Septiembre | Etapa 4 — Refactorización | MVP consolidado, app mobile en desarrollo, corrección de bugs |
| Octubre | Etapas 5 y 6 — Difusión y testeo | Manual de usuario, flyer, testing cruzado, corrección de errores |
| Noviembre | Etapas 7 y 8 — Presentación | Ensayo del pitch, documento final, repositorio limpio |
| Diciembre | Etapas 9 y 10 — Defensa | Mejoras post-feria, defensa oral final |

### Estrategia de priorización (MVP primero)

Para garantizar la entrega en tiempo y forma, el equipo adopta la siguiente prioridad de desarrollo:

**Prioridad 1 — Obligatorio para el MVP:**
- Backend funcional con FastAPI
- Integración con API de IA para análisis de texto
- Verificador de fuentes con MediaBias
- Frontend web operativo (Expo export → Vercel)

**Prioridad 2 — Objetivo secundario:**
- App mobile con ExpoGo / EAS Build

**Prioridad 3 — Bonus si el tiempo lo permite:**
- Extensión de Chrome completamente funcional

> Esta priorización no implica que los componentes secundarios estén ausentes en la presentación, sino que el equipo garantiza que el motor central funcione de manera sólida antes de expandir a otras plataformas.

---

## 3. Viabilidad Económica

El proyecto se desarrolla en el marco de una institución educativa, por lo que **no requiere inversión económica inicial.** Sin embargo, se identifican los siguientes costos potenciales:

| Recurso | Costo estimado | Alternativa gratuita |
|---|---|---|
| API de IA (Claude/Gemini/GPT) | Free tier disponible | Hugging Face (modelos open source) |
| Hosting backend | Free tier (Railway / Render) | Sin costo en etapa de desarrollo |
| Hosting frontend | Vercel Free tier | Sin costo |
| Base de datos | Supabase Free tier | Sin costo hasta 500 MB |
| EAS Build (app mobile) | Free tier (builds limitados) | Expo Go para desarrollo y demos |

**Conclusión:** El proyecto es viable sin inversión económica durante toda la etapa de desarrollo y presentación institucional. Las herramientas y servicios seleccionados cuentan con planes gratuitos suficientes para el alcance del MVP.

---

## 4. Viabilidad de Mercado

### Problema real y verificado

La desinformación digital es un problema de alta relevancia global. En el contexto latinoamericano, las noticias falsas circulan principalmente en español a través de WhatsApp, redes sociales y sitios de noticias de dudosa procedencia, sin herramientas accesibles para verificarlas.

### Brecha de mercado

Ninguno de los competidores actuales (NewsGuard, Ground News, Logically, InVID, Our.News, Google Fact Check Explorer) ofrece simultáneamente:

- Análisis con IA como motor central
- Enfoque en el mercado hispanohablante / latinoamericano
- Acceso completamente gratuito
- Disponibilidad en web, mobile y extensión de navegador

AletheIA ocupa esta brecha de manera directa.

### Público objetivo

Usuarios hispanohablantes de Argentina y Latam, de entre 16 y 45 años, que consumen noticias en formato digital y desean verificar rápidamente la veracidad de un artículo, publicación o mensaje antes de compartirlo.

---

## 5. Conclusión General

AletheIA es un proyecto **técnica, temporal y económicamente viable** dentro del marco del Proyecto FAT 2026, bajo las siguientes condiciones:

1. **Se prioriza el MVP** (web + backend + IA) como entregable principal, dejando app mobile y extensión como objetivos complementarios.
2. **No se entrena un modelo de IA propio.** Se utilizan APIs de IA existentes como motor del análisis.
3. **El scraping se implementa progresivamente:** BeautifulSoup primero, Playwright como mejora posterior.
4. **La documentación avanza en paralelo** al desarrollo, siguiendo las etapas institucionales.

El diferenciador más fuerte del proyecto es su enfoque en el contexto hispanohablante, una brecha real en el mercado actual de herramientas de detección de fake news.

---

*Documento generado como parte de la Etapa 1 del Proyecto FAT 2026 — Boreal Data*
