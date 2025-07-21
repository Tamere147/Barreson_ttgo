FROM node:20
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app
COPY . .

RUN npm install
RUN npx playwright install --with-deps

EXPOSE 3000
CMD ["npm", "start"]
