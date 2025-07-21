FROM node:20

# Création du dossier de travail
WORKDIR /app

# Copie des fichiers
COPY package*.json ./
RUN npm install

COPY . .

# Démarrage
CMD ["npm", "start"]
