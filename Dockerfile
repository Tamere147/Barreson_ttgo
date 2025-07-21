FROM node:20-slim

# Installe les dépendances nécessaires à Puppeteer
RUN apt-get update && apt-get install -y \
    wget ca-certificates fonts-liberation libappindicator3-1 \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libnspr4 libnss3 libxcomposite1 \
    libxdamage1 libxrandr2 xdg-utils libu2f-udev libvulkan1 libxss1 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Crée le dossier de travail
WORKDIR /app

# Copie les fichiers
COPY package.json ./
COPY index.js ./

# Installe Puppeteer
RUN npm install

CMD ["npm", "start"]
