FROM mcr.microsoft.com/playwright:v1.54.1-jammy

# Crée un dossier pour ton app
WORKDIR /app

# Copie les fichiers de ton projet
COPY . .

# Installe les dépendances
RUN npm install

# Expose le port
EXPOSE 3000

# Lance ton script
CMD ["npm", "start"]
