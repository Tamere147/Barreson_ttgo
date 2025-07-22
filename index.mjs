import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const app = express();
const PORT = process.env.PORT || 3000;

await page.goto('https://widget.nowplaying.site/hEcrFVjEMol3fzEC', {
  waitUntil: 'domcontentloaded'
});

const title = await page.title();
console.log('Page title:', title);

await browser.close();
