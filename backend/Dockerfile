# Imagen del backend de AletheIA para Cloud Run.
#
# Lo que la hace distinta de un Dockerfile de Node cualquiera es Puppeteer: el
# scraper cae en un navegador real cuando la nota necesita JavaScript para
# renderizarse (`src/scraper/puppeteerScraper.ts`). Eso obliga a tener Chromium
# adentro de la imagen.
#
# Se instala Chromium de Debian en vez de dejar que Puppeteer se lo baje solo:
# el npm de este proyecto bloquea los scripts de instalación (ver `allowScripts`
# en los package.json), así que el postinstall que descarga el navegador no
# correría y la imagen quedaría sin browser, fallando recién en runtime.
FROM node:24-bookworm-slim

# Chromium y las fuentes mínimas para que renderice texto. `--no-install-recommends`
# evita arrastrar medio escritorio.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Puppeteer usa este Chromium en vez de buscar el suyo.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Las dependencias primero, en su propia capa: mientras no cambie el lockfile,
# Docker reusa esta capa y el build tarda segundos en vez de minutos.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Fuera lo que solo hacía falta para compilar.
RUN npm prune --omit=dev

# Cloud Run inyecta PORT y espera que el server escuche ahí; `src/index.ts` ya
# lo lee. El 8080 es solo el default de la imagen.
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
