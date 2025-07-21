FROM mcr.microsoft.com/playwright:v1.54.1-jammy


# Définir le dossier de travail
WORKDIR /app

# Copier les fichiers
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Port exposé pour Koyeb
EXPOSE 10805

# Lancer ton script
CMD ["npm", "start"]

