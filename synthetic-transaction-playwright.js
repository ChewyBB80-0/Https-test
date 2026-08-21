import { chromium } from 'playwright';

const BASE_URL = (process.env.BASE_URL || 'https://idlehoursco.com/?country=US').replace(/\/$/, '');
const SEARCH_TERM = process.env.SEARCH_TERM || 'synthetic test';
const PRODUCT_PATH = process.env.PRODUCT_PATH || '';
const CART_PATH = process.env.CART_PATH || '/cart';
const USER_AGENT = process.env.USER_AGENT || 'SyntheticTrafficBot/1.1 (+https://example.com/bot)';
const PAGE_TIMEOUT = Number(process.env.PAGE_TIMEOUT_MS || 45000);

const log = (event, details = {}) => {
  console.log(JSON.stringify({ event, ...details }));
};

const delay = (min = 250, max = 1500) => new Promise((resolve) => {
  const ms = min + Math.floor(Math.random() * (max - min));
  setTimeout(resolve, ms);
});

async function clickFirstMatching(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count();
    if (count > 0) {
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) {
        continue;
      }

      try {
        await locator.click({ timeout: 5000 });
        return true;
      } catch (err) {
        continue;
      }
    }
  }
  return false;
}

async function fillSearch(page) {
  const searchTriggers = [
    'button[aria-label*="Search" i]',
    'button[title*="Search" i]',
    'a[aria-label*="Search" i]',
    '[data-testid*="search" i]',
    'button:has(svg)',
  ];

  for (const selector of searchTriggers) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0) {
      try {
        await locator.click({ timeout: 5000 });
        await page.waitForTimeout(500);
      } catch (err) {
        // Ignore trigger click failures and continue to direct fill attempts.
      }
    }
  }

  const selectors = [
    'input[name="q"]',
    'input[type="search"]',
    'input[placeholder*="Search" i]',
    'input[aria-label*="Search" i]',
    '#search',
    'textarea[name="q"]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0) {
      if (await locator.isVisible().catch(() => false)) {
        await locator.fill(SEARCH_TERM);
        await locator.press('Enter');
        await page.waitForLoadState('networkidle', { timeout: PAGE_TIMEOUT }).catch(() => {});
        return true;
      }
    }
  }

  return false;
}

async function maybeGoToProduct(page) {
  if (PRODUCT_PATH) {
    await page.goto(`${BASE_URL}${PRODUCT_PATH}`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await delay();
    return true;
  }

  const productSelectors = [
    'a[href*="/product"]',
    'a[href*="/products/"]',
    'a[href*="/item"]',
    '.product a',
    '.product-card a',
    '[data-testid*="product"] a',
  ];

  for (const selector of productSelectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0) {
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) {
        continue;
      }

      try {
        await locator.click({ timeout: 5000 });
        await page.waitForLoadState('networkidle', { timeout: PAGE_TIMEOUT }).catch(() => {});
        await delay();
        return true;
      } catch (err) {
        continue;
      }
    }
  }

  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const started = Date.now();

  try {
    log('start', { url: BASE_URL });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await delay();

    const searchUsed = await fillSearch(page);
    if (searchUsed) {
      log('search', { term: SEARCH_TERM });
    }

    await maybeGoToProduct(page);

    const addToCartSelectors = [
      'button:has-text("Add to cart")',
      'button.add-to-cart',
      'button[name="add"]',
      '#add-to-cart',
      'button:has-text("Add")',
      'input[value*="Add"]',
    ];

    if (await clickFirstMatching(page, addToCartSelectors)) {
      log('cart', { action: 'add' });
      await delay(500, 1500);
    }

    const cartSelectors = [`a[href="${CART_PATH}"]`, 'a[href*="/cart"]', '#cart'];
    if (await clickFirstMatching(page, cartSelectors)) {
      await page.waitForLoadState('networkidle', { timeout: PAGE_TIMEOUT }).catch(() => {});
      await delay();
    } else if (CART_PATH) {
      await page.goto(`${BASE_URL}${CART_PATH}`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT }).catch(() => {});
    }

    const screenshotPath = `synthetic-traffic-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });

    log('complete', {
      success: true,
      duration_ms: Date.now() - started,
      screenshot: screenshotPath,
      search_used: searchUsed,
    });
  } catch (error) {
    log('error', {
      message: error.message,
      duration_ms: Date.now() - started,
    });
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
