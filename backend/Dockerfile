# Imagen del backend de AletheIA.
#
# El scraper recurre a Puppeteer cuando una página necesita JavaScript para
# renderizarse (`src/scraper/puppeteerScraper.ts`), por lo que la imagen incluye
# Chromium. Se usa el paquete de Debian, que trae sus dependencias de sistema, en
# lugar del navegador que descarga Puppeteer (PUPPETEER_SKIP_DOWNLOAD).
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

# Configuración del puerto para el servidor
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]