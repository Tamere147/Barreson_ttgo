FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Définir le dossier de travail
WORKDIR /app

# Copier les fichiers
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Port exposé pour Koyeb
EXPOSE 3000

# Lancer ton script
CMD ["npm", "start"]

