# Viabilidad Comercial, Costos Reales y Registro Legal — AletheIA

**Empresa:** Boreal Data · **Producto:** AletheIA (detector de noticias falsas con IA: web, app mobile y extensión de Chrome)
**Cátedra:** Emprendimientos 7°C 2026 · **Fecha de relevamiento de precios:** 28/09/2026

> Todos los montos están en pesos argentinos (ARS) salvo aclaración. Los servicios cobrados en dólares se convierten al **dólar oficial BNA venta ($1.545, 25/09/2026)** más **30% de percepción de Ganancias y 21% de IVA** que se aplican al pagar servicios digitales del exterior con tarjeta: **1 USD ≈ $2.333**.

---

## 1. Cuadro de costos reales y monetización

### 1.1 Costos fijos reales

Son los costos que se pagan aunque no haya un solo usuario.

#### a) Inversión inicial (pago único)

| Concepto | Detalle | Precio unitario | Total |
|---|---|---|---|
| Registro de marca "AletheIA" en INPI | 2 clases de Niza: **9** (software/app descargable) y **42** (SaaS, servicios informáticos). 100 UMAPI por clase × $405,69 (UMAPI sept. 2026) | $40.569 / clase | **$81.138** |
| Búsqueda / informe de antecedentes INPI | 12 UMAPI, para no pagar una marca que ya existe (el arancel no se devuelve) | $4.868 | **$4.868** |
| Depósito de software inédito en DNDA | Código fuente de AletheIA (web + backend + extensión + app). Vigencia 3 años | $1.400 | **$1.400** |
| Cuenta de desarrollador Google Play | USD 25, pago único | USD 25 | **$58.324** |
| Cuenta de desarrollador Chrome Web Store | USD 5, pago único (necesaria para publicar la extensión) | USD 5 | **$11.665** |
| **Subtotal legal y cuentas** | | | **$157.395** |

#### b) Costos fijos recurrentes (por mes)

| Concepto | Detalle | Costo anual | **Costo mensual** |
|---|---|---|---|
| Dominio `aletheia.com.ar` (NIC Argentina) | Alta y renovación: $8.500/año | $8.500 | **$708** |
| Base de datos Cloud SQL (PostgreSQL) | Instancia mínima `db-f1-micro` + almacenamiento ≈ USD 10/mes. No tiene capa gratuita, por eso es fijo | — | **$23.330** |
| Apple Developer Program | USD 99/año, para publicar la app en iOS | $230.962 | **$19.247** |
| Monotributo (Categoría A) | Cuota vigente desde agosto 2026 (impuesto + jubilación + obra social) | — | **$49.527** |
| Horas de mantenimiento | 20 h/mes × $9.616 (corrección de errores, actualizar dependencias, monitoreo) | — | **$192.313** |
| Licencias de software (IDEs, GitHub, Figma) | VS Code, Git, GitHub (plan Free para organizaciones), Node.js, Expo, WXT y Figma (plan Starter) son gratuitos | — | **$0** ¹ |
| **TOTAL COSTOS FIJOS MENSUALES** | | | **$285.125** |

¹ *Esto no es un "costo $0" inventado: estas herramientas tienen licencias gratuitas oficiales (open source o planes gratuitos). Si el equipo crece y necesita GitHub Team (USD 4 por usuario por mes), serían ≈ $18.700/mes para 2 personas.*

### 1.2 Valorización de horas/hombre (mano de obra técnica)

**Valor hora de referencia:** según la **Encuesta de Sueldos sysarmy 2026.01 (análisis de OpenQube)**, la mediana del sueldo bruto de un **programador Junior** en Argentina es **$1.538.500/mes**.
Si se divide por 160 horas mensuales (40 h × 4 semanas), da **$9.616 por hora**.

**Horas totales del proyecto:** la referencia de la cátedra es que las horas de clase del año equivalen, **por alumno**, a trabajar 8 h por día durante 2 meses: unos 44 días hábiles × 8 h = 352 h. Para los 2 integrantes, el máximo teórico sería **704 h**, pero eso supone aprovechar el 100% de las horas de clase para desarrollo, algo que no ocurre en la práctica (hay teoría, otras materias, presentaciones y relevamientos). Tomamos un **aprovechamiento real del 50%**: **352 h en total (≈ 176 h por integrante)**. El equipo desarrolla con asistencia de IA (generación de código, revisión y documentación), así que esas horas se reparten sobre todo en **diseñar, revisar, integrar y probar**, más que en escribir código desde cero.

| Módulo del MVP | Responsable | Horas | Costo ($9.616/h) |
|---|---|---|---|
| Backend (API Node/Express, integración con Gemini en Vertex AI, Firebase Auth + JWT, Cloud SQL) | Ciro | 90 | $865.406 |
| Frontend web (Next.js + TypeScript + Tailwind) | Renzo | 80 | $769.250 |
| Extensión de Chrome (Manifest V3 + WXT) | Ciro / Renzo | 45 | $432.703 |
| App mobile (Expo) | Renzo | 55 | $528.859 |
| Diseño de interfaz e identidad de marca | Renzo | 25 | $240.391 |
| Testing, QA y deploy en Cloud Run | Equipo | 25 | $240.391 |
| Gestión (GitHub Projects), documentación y bitácora | Equipo | 32 | $307.700 |
| **TOTAL DESARROLLO DEL MVP** | | **352 h** | **$3.384.700** (≈ USD 2.191) |

**Inversión total para lanzar el MVP (pago único):** $3.384.700 (mano de obra) + $157.395 (legal y cuentas) = **$3.542.095** (≈ USD 2.293)

> Aunque en el contexto escolar nadie cobre sueldo, este es el **valor económico real** del trabajo del equipo. Lo que efectivamente sale del bolsillo son solo los **$157.395** de trámites y cuentas.

### 1.3 Costos variables reales

Son los costos que crecen con cada usuario o cada análisis.

| Concepto | Cómo se cobra (precio oficial) | Costo en AletheIA |
|---|---|---|
| **Consumo de IA: Gemini 2.5 Flash (Vertex AI)** | USD 0,30 por millón de tokens de entrada, USD 2,50 por millón de tokens de salida | Un análisis promedio usa ~3.000 tokens de entrada (noticia + prompt) y ~1.500 de salida (JSON con veredicto, confianza y fuentes) → USD 0,00465 ≈ **$10,85 por análisis** |
| **Búsqueda web en tiempo real (Grounding con Google Search)** | 1.500 consultas por día gratis; después, USD 35 cada 1.000 | Gratis hasta ~45.000 análisis por mes. A partir de ahí, **$81,65 extra por análisis** |
| **Servidor backend (Cloud Run)** | Gratis hasta 2 millones de requests y 180.000 vCPU-segundos por mes; después, USD 0,40 por millón de requests + USD 0,000024 por vCPU-segundo | **$0** durante la etapa MVP. Solo empieza a cobrar con miles de usuarios activos |
| **Autenticación (Firebase Auth)** | Gratis hasta 50.000 usuarios activos por mes | **$0** en la etapa MVP |
| **Comisión de Mercado Pago (suscripciones)** | 3,56% + IVA con acreditación a 18 días (Buenos Aires, vigente desde marzo 2026) | **4,31% de cada cobro** |
| **Comisión de Google Play / App Store** (solo si se cobra dentro de la app) | 15% en suscripciones | Se evita cobrando por la web con Mercado Pago |

**Conclusión sobre los variables:** el costo real por análisis (**≈ $11**) es muy bajo. El riesgo está en superar el cupo gratuito del grounding, porque el costo por análisis se multiplica por ~8. Por eso el plan gratuito tiene un límite diario.

### 1.4 Modelo de monetización elegido: **Freemium + SaaS (suscripción)**

| Plan | Precio | Incluye | Público |
|---|---|---|---|
| **Gratuito** | $0 | 5 análisis por día, extensión de Chrome y app, veredicto + nivel de confianza | Público general, estudiantes |
| **Premium** | **$6.999/mes** (≈ USD 4,50) | Análisis ilimitados (uso razonable), historial, fuentes detalladas, análisis de imágenes y links | Usuarios frecuentes: periodistas freelance, docentes, community managers |
| **Institucional** | **$180.000/mes** | 3.000 análisis por mes, cuentas para todo el equipo, panel de control, soporte | Escuelas, medios locales, ONGs, áreas de comunicación |

**Por qué elegimos este modelo:**
- **Freemium:** combatir la desinformación necesita **muchos usuarios**. Cobrar desde el primer día frenaría la adopción, y un usuario gratuito cuesta como máximo ~$1.600/mes (150 análisis × $10,85).
- **SaaS:** AletheIA corre en la nube (Cloud Run + Vertex AI) y tiene costos que se repiten todos los meses. Una **licencia de pago único** no cubriría el consumo de IA que sigue ocurriendo después de la venta.
- **Descartamos Hardware + Mantenimiento:** el proyecto no incluye dispositivos físicos.
- **Plan institucional:** son las escuelas y los medios los que tienen presupuesto y la necesidad de verificar información de forma constante.

**Números del plan Premium (por usuario, por mes):**

| Concepto | Monto |
|---|---|
| Precio de la suscripción | $6.999 |
| − Comisión de Mercado Pago (4,31%) | −$301 |
| − Consumo de IA (100 análisis × $10,85) | −$1.085 |
| **Margen de contribución** | **$5.613** |

**Punto de equilibrio:** $285.125 de costos fijos ÷ $5.613 de margen = **51 suscriptores Premium** (o bien 2 instituciones: cada una deja un margen de ≈ $139.700).

---

## 2. Instructivo legal: ¿qué trámites debe hacer Boreal Data?

**Pregunta de consultoría:** *¿Qué trámites concretos debe realizar nuestra agencia en Argentina para formalizarse y proteger nuestro software, hardware y nombre comercial?*

### Paso 0 — Formalizarse (ARCA)
1. Cada integrante saca su **CUIT** y la **Clave Fiscal nivel 3** en ARCA (ex AFIP).
2. Se inscribe en el **Monotributo** con una actividad de servicios informáticos (Categoría A: $49.527/mes). Con esto ya puede emitir **facturas C** electrónicas.
3. Más adelante, si la empresa crece, puede constituir una **SAS** (Sociedad por Acciones Simplificada) en la IGJ o en el registro de su provincia, para que la empresa sea la titular de la marca y del software.
4. En la Clave Fiscal se habilitan los servicios **"INPI – Trámites"** y **TAD (Trámites a Distancia)**. Ambos se necesitan para los pasos siguientes.

### Paso 1 — Registrar la marca comercial en el INPI
**Qué se protege:** el nombre "AletheIA" y su logo (y, si se quiere, "Boreal Data").
**Dónde:** Portal de Trámites del INPI (`portaltramites.inpi.gob.ar`).

1. **Buscar antecedentes** en la base de marcas del INPI para confirmar que no haya una marca igual o parecida en las mismas clases. El informe oficial cuesta 12 UMAPI ($4.868).
2. **Elegir las clases de Niza:** la **9** (software y aplicaciones descargables) y la **42** (software como servicio, SaaS).
3. **Elegir el tipo de marca:** *denominativa* (solo el nombre) o *mixta* (nombre + logo). Lo recomendable es registrar ambas cuando haya presupuesto.
4. **Presentar la solicitud** online y **pagar el arancel**: 100 UMAPI por clase ($40.569 en septiembre 2026; el valor se actualiza cada mes por inflación).
5. **Publicación en el Boletín de Marcas:** durante **30 días** cualquier persona puede oponerse.
6. Si nadie se opone y el INPI no hace observaciones, se **otorga el título**, que dura **10 años** y se puede renovar. Entre el año 5 y el 6 hay que presentar la **declaración jurada de uso**.

**Costo:** $85.006 (2 clases + búsqueda previa) · **Plazo:** desde unos meses hasta más de un año.

### Paso 2 — Registrar el código/software en la DNDA (derecho de autor)
**Qué se protege:** el código fuente de AletheIA (backend, web, extensión y app).
**Aclaración importante:** en Argentina **el software no se patenta**. Se protege con el **derecho de autor** (Ley 11.723, que desde la Ley 25.036 incluye expresamente a los programas de computación). La protección existe desde que se crea la obra; el registro sirve para tener una **fecha cierta que pruebe la autoría**.

1. Ingresar a **TAD** y buscar el trámite **"Depósito en custodia de obra inédita – Software"** (mientras el código no se publique ni se venda).
2. Pagar **$1.400** por transferencia al *Fondo Cooperador Ley 23.412 DNDA-CESSI* (alias **CAMARACESSI**) y subir el comprobante.
3. Cargar los datos de los autores (nombre, CUIL, domicilio y **porcentaje de titularidad** de cada uno, por ejemplo Renzo 50% / Ciro 50%).
4. El sistema genera el **número de expediente** y dos **carátulas**.
5. Grabar el código en un **pendrive, CD o DVD** y colocarlo en un **sobre de papel madera A4 cerrado y firmado** en los cierres, con las carátulas pegadas por fuera.
6. Entregarlo en la **DNDA (Moreno 1230, CABA)**, enviarlo por correo o presentarlo en una receptoría del interior.
7. La **constancia** llega por TAD. Dura **3 años** y se puede renovar dentro de los 30 días siguientes al vencimiento.
8. Cuando AletheIA se lance al público, corresponde el trámite de **registro de obra publicada – software**.

**Costo:** $1.400 · **Plazo:** el trámite online lleva unos 15 minutos, más la entrega física.

### Paso 3 — ¿Hace falta patente o modelo industrial? (hardware)
Estos trámites **solo corresponden si se inventa un dispositivo físico nuevo**. Se hacen en el **INPI**:
- **Patente de invención:** para algo nuevo, con actividad inventiva y aplicación industrial. Cuesta 266 UMAPI la solicitud + 444 UMAPI el examen de fondo (≈ $288.000), más anualidades durante 20 años.
- **Modelo de utilidad:** para una mejora práctica sobre algo que ya existe. Dura 10 años.
- **Modelo o diseño industrial:** protege solo la forma estética del aparato.

**En el caso de AletheIA: NO corresponde.** El proyecto es 100% software (web, app y extensión) y no tiene hardware propio. Por eso **no se presupuesta ninguna patente**.

### Paso 4 — Complementarios
- **Dominio:** registrar `aletheia.com.ar` en **NIC Argentina** ($8.500/año) con la misma Clave Fiscal.
- **Datos personales:** AletheIA guarda cuentas de usuarios (Firebase Auth + Cloud SQL). Según la **Ley 25.326**, la base de datos debe inscribirse en el **Registro Nacional de Bases de Datos de la AAIP** (trámite gratuito), y la app debe publicar una **política de privacidad**.

### Resumen de trámites

| Qué se protege | Organismo | Trámite | Costo | Vigencia |
|---|---|---|---|---|
| Actividad comercial | ARCA | Inscripción en Monotributo | $49.527/mes | Mensual |
| Nombre y logo "AletheIA" | INPI | Registro de marca (clases 9 y 42) | $85.006 | 10 años |
| Código fuente | DNDA | Depósito de software inédito | $1.400 | 3 años |
| Hardware | INPI | Patente / modelo de utilidad | **No aplica** | — |
| Dominio web | NIC Argentina | Alta de `.com.ar` | $8.500 | 1 año |
| Base de datos de usuarios | AAIP | Inscripción en el registro de bases de datos | Gratis | — |

---

## 3. Diagnóstico comercial de la mejora (Fase 1 del documento de cátedra)

- **Mejora técnica evaluada:** verificación con búsqueda web en tiempo real (*Grounding with Google Search* en Gemini), para que el veredicto cite fuentes actuales y no dependa solo de lo que el modelo aprendió.
- **Tiempo de desarrollo:** unas 24 h (activar la herramienta en el backend, adaptar el contrato JSON `CONTRATO_ANALISIS.md` y mostrar las fuentes en la pantalla de resultado).
- **Recursos extra:** ninguno al inicio (1.500 consultas gratis por día); a partir de ~45.000 análisis por mes, USD 35 cada 1.000.
- **Impacto en la propuesta de valor:** **[X] Elevado.** Sin fuentes actualizadas, un detector de noticias falsas no puede verificar hechos recientes, que es justamente el problema principal. Además, es lo que justifica cobrar el plan Premium.
- **Decisión:** **se aprueba para el MVP.** Cuesta 24 h (≈ $230.775 en horas de trabajo), el costo es $0 mientras se esté dentro del cupo gratuito, y el límite de 5 análisis por día del plan gratuito protege ese cupo.

---

## Fuentes

- NIC Argentina — [Dominios y Aranceles](https://nic.ar/es/dominios/aranceles)
- INPI — [Aranceles vigentes (valor UMAPI)](https://portaltramites.inpi.gob.ar/InfoPortal/Aranceles) · [Resolución INPI 75/2026](https://www.boletinoficial.gob.ar/detalleAviso/primera/339726/20260320) · [Res. 78/2026](https://www.argentina.gob.ar/normativa/nacional/norma-424197)
- Servidos — [Calculadora INPI (UMAPI de patentes)](https://servidos.ar/calculadora-marcas-patentes)
- DNDA — [Depósito en custodia de obra inédita software](https://www.argentina.gob.ar/servicio/deposito-en-custodia-de-obra-inedita-software)
- Sysarmy / OpenQube — [Encuesta de Sueldos 2026.01](https://sueldos.openqube.io/encuesta-sueldos-2026.01/) · [Mediana Junior (Teclab)](https://teclab.edu.ar/tecnologia-y-desarrollo/cuanto-gana-un-programador-junior/)
- Google Cloud — [Precios de Vertex AI (Gemini)](https://cloud.google.com/vertex-ai/generative-ai/pricing) · [Precios de Cloud Run](https://cloud.google.com/run/pricing) · [Precios de Cloud SQL](https://www.bytebase.com/dbcost/cloudsql-pricing/)
- Mercado Pago — [Comisiones de cobro online 2026 (Shoperly)](https://www.shoperly.app/blog/cobrar-online-argentina-metodos-pago)
- Tiendas — [Apple / Google Play](https://playcode.io/blog/how-much-does-it-cost-to-publish-an-app) · [Chrome Web Store](https://www.extensionradar.com/blog/chrome-web-store-developer-fee-2026)
- ARCA — [Monotributo desde agosto 2026 (Ámbito)](https://www.ambito.com/economia/cambios-el-monotributo-arca-septiembre-2026-nuevo-calendario-pagos-y-escala-cuotas-n6317942)
- Cotización del dólar — [El Cronista, Dólar BNA](https://www.cronista.com/MercadosOnline/moneda/ARS/)
