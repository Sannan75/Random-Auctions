# Random Auction Explorer

A small local Electron app for curiosity-browsing random-ish live eBay listings and saving oddities to a personal favourites shelf.

## Setup

```bash
npm install
npm run electron:dev
```

For a production build:

```bash
npm run build
```

## Browser / PWA

Run the manual-mode browser version on your local network:

```bash
npm run dev:web
```

Create the installable production build in `dist-renderer`:

```bash
npm run build:pwa
```

Deploy `dist-renderer` to an HTTPS host, then open it in iPad Safari and use **Share > Add to Home Screen**. Browser favourites and settings are stored in that browser's local storage; use JSON export for portable backups.

## Beta packages

Build the Windows installer, PWA deployment zip, and release notes together:

```bash
npm run package:beta
```

Finished artifacts are written to `release`.

## Data modes

Random Auction Explorer supports two modes:

- **API mode**: if `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` exist in `.env`, the app uses the isolated eBay service in the Electron main process.
- **Manual mode**: if credentials are missing, the app generates randomized eBay search links and lets you add favourites manually.

Secrets are never shown in the UI.

## Optional eBay API credentials

Copy `.env.example` to `.env` and fill in your eBay Browse API application credentials:

```env
EBAY_CLIENT_ID=your-client-id
EBAY_CLIENT_SECRET=your-client-secret
EBAY_MARKETPLACE_ID=EBAY_GB
```

The API integration is intentionally isolated in `electron/services/ebayApiService.ts`. If eBay changes response shapes or token requirements, that file is the place to adjust behaviour.

## Local persistence

Favourites and settings are saved as JSON under Electron's `userData` directory. There is no database, cloud backend, account login, purchasing flow, or scraper.
