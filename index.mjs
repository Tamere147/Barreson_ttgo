// index.mjs
import express from 'express';
import { chromium } from 'playwright';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  res.send('OK'); // Réponse attendue par Koyeb
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
