import express from 'express';
import { chromium } from 'playwright';

const app = express();
const port = process.env.PORT || 3000;

// ✅ Pour Koyeb : réponse simple pour le health check
app.get('/', (req, res) => {
  res.send('OK');
});

// ✅ Route qui lance le scraper Playwright et récupère le titre
app.get('/nowplaying', async (req, res) => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC');

    const title = await page.textContent('h1'); // ajuste le sélecteur si besoin
    await browser.close();

    res.send(`Titre actuel : ${title}`);
  } catch (error) {
    res.status(500).send('Erreur lors du scraping : ' + error.message);
  }
});

// ✅ Lancement du serveur Express
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
