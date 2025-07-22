import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
  waitUntil: 'domcontentloaded'
});

const title = await page.title();
console.log('Page title:', title);

await browser.close();
