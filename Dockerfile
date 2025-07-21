FROM node:20

WORKDIR /app
COPY . .

RUN npm install
RUN npx playwright install --with-deps

EXPOSE 3000
CMD ["npm", "start"]
