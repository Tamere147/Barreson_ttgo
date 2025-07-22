import express from 'express';
import { chromium } from 'playwright';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('OK');
});

app.get('/nowplaying', async (req, res) => {
  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', { waitUntil: 'domcontentloaded' });

    const title = await page.textContent('h1'); // adapte ce sélecteur si nécessaire
    await browser.close();

    res.send(`Titre actuel : ${title}`);
  } catch (err) {
    console.error('Erreur Playwright:', err);
    res.status(500).send('Erreur Playwright : ' + err.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
