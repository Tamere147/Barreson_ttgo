const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
    waitUntil: 'domcontentloaded'
  });

  try {
    // Attente des bons sélecteurs
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content img#album.active');
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content div#player-track div.artists-height-fix h4#artists.active');
    await page.waitForSelector('html body div.wrapper div#app-cover.raise.active div#player div#player-content div#player-track h2#name.active');

    // Récupération avec chemin CSS précis
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
