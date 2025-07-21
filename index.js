import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
    waitUntil: 'domcontentloaded',
    timeout: 60000 // ← plus généreux
  });

  try {
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content img#album.active', { timeout: 30000 });
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content div#player-track div.artists-height-fix h4#artists.active', { timeout: 30000 });
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content div#player-track h2#name.active', { timeout: 30000 });

    const artist = await page.$eval('h4#artists.active', el => el.textContent.trim());
    const title = await page.$eval('h2#name.active', el => el.textContent.trim());
    const image = await page.$eval('img#album.active', el => el.src);

    console.log({ artist, title, image });

  } catch (err) {
    console.error('❌ Erreur de scraping :', err.message);
  }

  await browser.close();
})();
