# Utilise une image officielle Node avec Puppeteer
FROM ghcr.io/puppeteer/puppeteer:latest

# Crée un dossier de travail
WORKDIR /app

# Copie les fichiers du projet dans le conteneur
COPY package.json .
COPY index.js .

# Installe les dépendances
RUN npm install

# Définit la commande de démarrage
CMD ["node", "index.js"]
