// scraper.js
import puppeteer from 'puppeteer';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
app.get('/nowplaying', async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  
    const page = await browser.newPage();
    await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForSelector('h4#artists.active', { timeout: 60000 });
    await page.waitForSelector('h2#name.active', { timeout: 60000 });
    await page.waitForSelector('img#album.active', { timeout: 60000 });

    const artist = await page.$eval('h4#artists.active', el => el.textContent.trim());
    const title = await page.$eval('h2#name.active', el => el.textContent.trim());
    const image = await page.$eval('img#album.active', el => el.src);

    res.json({ artist, title, image });
  } catch (err) {
    console.error('❌ Scraping failed:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}/nowplaying`);
});
