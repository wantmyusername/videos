FROM node:18-bullseye

# Instalar Chrome y dependencias
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
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copiamos TODO el proyecto primero (incluyendo package.json)
COPY . .

# 2. Ahora sí instalamos (usamos legacy-peer-deps para evitar conflictos)
RUN npm install --legacy-peer-deps

# Exponemos puerto
EXPOSE 8000

# Arrancamos
CMD ["npx", "tsx", "server.ts"]
