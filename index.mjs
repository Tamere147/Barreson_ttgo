import express from 'express';
import { chromium } from 'playwright';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('OK');
});

app.get('/nowplaying', async (req, res) => {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true, // optionnel, mais utile pour debug
    });

    const page = await browser.newPage();

    await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
      waitUntil: 'domcontentloaded',
      timeout: 15000, // 15 sec
    });

    const title = await page.textContent('h1');

    res.send(`Titre actuel : ${title}`);
  } catch (err) {
    console.error('Erreur Playwright :', err);
    res.status(500).send('Erreur Playwright : ' + err.message);
  } finally {
    if (browser) {
      await browser.close(); // ne ferme que si ouvert
    }
  }
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
