# Boreal Data | aletheIA 🛡️

**aletheIA** es un ecosistema inteligente de detección de desinformación (*fake news*) diseñado para operar en tiempo real a través de múltiples plataformas: Web, Aplicación Móvil y Extensión de Navegador. 

Desarrollado por el equipo de **Boreal Data**, el sistema no solo analiza texto, sino que evalúa el contexto, la reputación de la fuente y la integridad lógica de la información para proporcionar un **Score de Veracidad** confiable.

---

## 🚀 Funcionalidades Principales

*   **Análisis Multimodal**: Capacidad de procesar información a partir de URLs directas, capturas de pantalla y el contenido dinámico de la ventana activa.
*   **Detección en Tiempo Real**: Gracias a la integración vía API, el usuario recibe una etiqueta de veracidad y una explicación detallada en segundos.
*   **Verificación de Fuentes**: Consulta una base de datos propia de reputación mediática (basada en MediaBias) para alertar sobre fuentes con historial de desinformación.
*   **Sincronización Total**: Historial de análisis y preferencias compartidas entre la web, el móvil y la extensión mediante autenticación centralizada.

---

## 🛠️ Stack Tecnológico

El proyecto utiliza una arquitectura moderna de **código compartido** y **servicios desacoplados**:

### **Front-end**
*   **Core**: Expo (React Native) con TypeScript.
*   **Plataformas**: 
    *   **Web**: Exportación estática desplegada en **Vercel**.
    *   **Móvil**: Desarrollo con **Expo Go** y compilación con **EAS Build**.
    *   **Extensión**: Arquitectura **Manifest V3** con un wrapper JS para inyección de lógica en el navegador.

### **Back-end & IA**
*   **API**: **FastAPI** (Python) por su alto rendimiento asíncrono.
*   **Extracción de datos**: Sistema híbrido con **BeautifulSoup** y **Playwright** para superar muros de JavaScript.
*   **Cerebro IA**: Integración con modelos de lenguaje de gran escala (**Claude / GPT / Gemini**) optimizados mediante ingeniería de prompts.

### **Infraestructura**
*   **Base de Datos**: PostgreSQL gestionado en **Supabase**.
*   **Autenticación**: Supabase Auth con manejo de tokens **JWT**.

---

## 👥 Colaboradores

Detrás de **Boreal Data** se encuentran:

*   **Renzo Lanata** – *Lead Front-end Developer*: Responsable de la arquitectura multiplataforma en Expo, diseño de UI/UX y la integración de la extensión de navegador.
*   **Ciro Di Marsico** – *Lead Back-end Developer*: Responsable de la lógica de análisis en FastAPI, la orquestación del Motor IA y el sistema de scraping.

---

## 📈 Proyección y Futuro

**aletheIA** nace como un proyecto final de secundaria, pero con una visión de escalabilidad hacia una formalización como **PYME** tecnológica:
1.  **Versión 2.0**: Implementación de detección de *deepfakes* en video y audio.
2.  **API Pública**: Permitir que otros desarrolladores integren el motor de análisis de Boreal Data en sus propias plataformas.
3.  **Comunidad**: Crear un sistema de reportes comunitarios para alimentar la base de datos de fuentes de forma descentralizada.
