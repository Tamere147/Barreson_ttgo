import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 10805;

app.get('/nowplaying', async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForSelector('h4#artists.active');

    const artist = await page.$eval('h4#artists.active', el => el.textContent.trim());
    const title = await page.$eval('h2#title.active', el => el.textContent.trim());

    const image = await page.$eval('.artwork', el => {
      const style = el.getAttribute('style');
      const match = style.match(/url\(['"]?(.*?)['"]?\)/);
      return match ? match[1] : '';
    });

    res.json({ artist, title, image });
  } catch (err) {
    console.error('❌ Scraping failed:', err);
    res.status(500).json({ error: 'Scraping failed' });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}/nowplaying`);
});
