FROM node:18-bullseye

ENV PUPPETEER_SKIP_DOWNLOAD=true

# Dependencias de Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar manifests primero (cache friendly)
COPY package*.json ./

RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

CMD ["npm", "start"]
