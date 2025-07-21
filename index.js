import { chromium } from 'playwright';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/nowplaying', async (req, res) => {
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Chemins CSS exacts comme dans ton code Puppeteer
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content img#album.active', { timeout: 30000 });
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content div#player-track div.artists-height-fix h4#artists.active', { timeout: 30000 });
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content div#player-track h2#name.active', { timeout: 30000 });

    const artist = await page.$eval(
      'html body div.wrapper div#app-cover.raise.active div#player div#player-content div#player-track div.artists-height-fix h4#artists.active',
      el => el.textContent.trim()
    );

    const title = await page.$eval(
      'html body div.wrapper div#app-cover.raise.active div#player div#player-content div#player-track h2#name.active',
      el => el.textContent.trim()
    );

    const image = await page.$eval(
      'html body div.wrapper div#app-cover.raise.active div#player div#player-content img#album.active',
      el => el.src
    );

    res.json({ artist, title, image });

  } catch (err) {
    console.error('❌ Scraping failed:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur Playwright actif sur http://localhost:${PORT}/nowplaying`);
});
