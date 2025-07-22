import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox']
});

const page = await browser.newPage();

// FAIRE PASSER POUR UN VRAI NAVIGATEUR
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
await page.setViewport({ width: 1366, height: 768 });

await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
  waitUntil: 'networkidle0', // attendre que le réseau soit "calme"
  timeout: 60000
});

try {
  await page.waitForSelector('#player #player-content img#album.active', { timeout: 30000 });
  await page.waitForSelector('#player #player-content #player-track h2#name.active', { timeout: 30000 });
  await page.waitForSelector('#player #player-content #player-track h4#artists.active', { timeout: 30000 });

  const title = await page.$eval('#player #player-content #player-track h2#name.active', el => el.textContent.trim());
  const artist = await page.$eval('#player #player-content #player-track h4#artists.active', el => el.textContent.trim());
  const image = await page.$eval('#player #player-content img#album.active', el => el.src);

  console.log({ title, artist, image });
} catch (err) {
  console.error('❌ Scraping failed:', err.message);
}

await browser.close();
