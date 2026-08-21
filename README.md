# Synthetic Traffic Generator

This repository contains synthetic browser and HTTP transactions designed to generate realistic web traffic against a target website.

## Included files

- `synthetic-transaction-playwright.js` — headless browser flow that visits the homepage, searches, opens a product page, adds to cart, and captures a screenshot.
- `synthetic-transaction-k6.js` — lightweight HTTP-level synthetic traffic script for repeatable checks.
- `.github/workflows/run-playwright.yml` — GitHub Action that runs the browser flow on a schedule.
- `.github/workflows/run-k6.yml` — GitHub Action that runs the k6 flow on a schedule.

## Quick start

### Browser flow

```bash
npm install
BASE_URL=https://your-site.com SEARCH_TERM="synthetic traffic" node synthetic-transaction-playwright.js
```

Optional environment variables:

- `PRODUCT_PATH=/product/example-product`
- `CART_PATH=/cart`
- `PAGE_TIMEOUT_MS=45000`
- `USER_AGENT="SyntheticTrafficBot/1.1 (+https://example.com/bot)"`

### HTTP flow

```bash
BASE_URL=https://your-site.com SEARCH_TERM="synthetic traffic" k6 run synthetic-transaction-k6.js
```

## Notes

- Use only against websites you own or are authorized to test.
- Store the target site in the GitHub Actions secret `SYNTHETIC_BASE_URL`.
- The scripts are intentionally simple and meant to mimic a realistic customer journey without triggering fragile selectors or private flows.
