import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/nowplaying', async (req, res) => {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
      waitUntil: 'domcontentloaded',
      timeout: 0
    });

    await page.waitForSelector('h4#artists.active', { timeout: 10000 });

    const artist = await page.$eval('h4#artists.active', el => el.textContent.trim());
    const title = await page.$eval('h2#title.active', el => el.textContent.trim());
    const image = await page.$eval('.artwork', el => {
      const style = el.getAttribute('style');
      const match = style.match(/url\(['"]?(.*?)['"]?\)/);
      return match ? match[1] : '';
    });

    await browser.close();

    res.json({ artist, title, image });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur en ligne sur http://localhost:${PORT}/nowplaying`);
});
