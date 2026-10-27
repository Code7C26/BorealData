# Imagen del backend de AletheIA.
# Incluye Chromium de Debian para que Puppeteer funcione correctamente en producción.
FROM node:24-bookworm-slim

# Instalar Chromium y fuentes mínimas para renderizado
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Configurar Puppeteer para usar el Chromium del sistema
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Copilar dependencias (incluyendo devDependencies para compilar TypeScript)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Limpiar dependencias de desarrollo para dejar la imagen ligera
RUN npm prune --omit=dev

# El servidor escucha por defecto en el puerto 8080
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]