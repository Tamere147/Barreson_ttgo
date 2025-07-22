// index.js
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

const SCRAPE_INTERVAL = 15000; // 15 seconds

async function scrapeAndSend() {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
      waitUntil: 'networkidle0',
      timeout: 0
    });

    const data = await page.evaluate(() => {
      const title = document.querySelector('.track-name')?.innerText || '';
      const artist = document.querySelector('.artist-name')?.innerText || '';
      const progress = document.querySelector('.progress-time')?.innerText || '';
      return { title, artist, progress };
    });

    await browser.close();

    console.log("Données Spotify :", data);

    // Envoie les données vers ton serveur
    await fetch('https://waytec.fr/nowplaying_api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.error('Erreur scraping :', err);
  }
}

setInterval(scrapeAndSend, SCRAPE_INTERVAL);
scrapeAndSend();
