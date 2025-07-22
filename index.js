const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // ✅ On définit le user agent **après** avoir créé `page`
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

  await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  try {
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

    console.log({ artist, title, image });
  } catch (err) {
    console.error('❌ Erreur de scraping :', err.message);
  }

  await browser.close();
})();
