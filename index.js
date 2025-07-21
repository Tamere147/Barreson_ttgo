import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
    waitUntil: 'domcontentloaded',
    timeout: 0,
  });

  try {
    // Attente des sélecteurs complets
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content img#album.active', { timeout: 30000 });
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content div#player-track div.artists-height-fix h4#artists.active', { timeout: 30000 });
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content div#player-track h2#name.active', { timeout: 30000 });

    // Scraping des données
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

    console.log({ artist, title, image });

  } catch (err) {
    console.error('❌ Erreur de scraping :', err.message);
  }

  await browser.close();
})();
