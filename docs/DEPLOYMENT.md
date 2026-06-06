# Deployment Guide — Reimbursement v0.7

## Overview

The app is built with **Expo SDK 56** and targets **Expo Web** as the primary deployment target.
All data is stored locally in SQLite via `expo-sqlite`. There is no backend or cloud dependency.

---

## Prerequisites

```bash
node -v     # 18+ required
npm -v      # 9+ required
npx expo --version   # Should be 56.x
```

Install dependencies:

```bash
npm install
```

---

## Development

Start the dev server (web):

```bash
npm run web
# or
npx expo start --web
```

Start on Android emulator:

```bash
npm run android
```

---

## Production Web Build

Build a static web bundle:

```bash
npx expo export --platform web
```

Output: `dist/` folder — static HTML/JS/CSS, ready to serve from any static host.

---

## Hosting Recommendations

### Option A — GitHub Pages (Recommended for personal/internal use)

1. Build:
   ```bash
   npx expo export --platform web
   ```
2. Push `dist/` to the `gh-pages` branch:
   ```bash
   npx gh-pages -d dist
   ```
3. Enable GitHub Pages in repo Settings → Pages → Source: `gh-pages` branch.

**Free, no server required, auto-deployed on push.**

### Option B — Netlify (Recommended for shared team access)

1. Connect the GitHub repo to Netlify.
2. Set build command: `npx expo export --platform web`
3. Set publish directory: `dist`
4. Netlify auto-deploys on every push to `master`.

**Free tier supports small teams. Provides HTTPS and custom domain.**

### Option C — Vercel

1. Connect the GitHub repo to Vercel.
2. Override build command: `npx expo export --platform web`
3. Override output directory: `dist`

---

## Rollback Instructions

### If using GitHub Pages

```bash
# Roll back to previous deploy by reverting the gh-pages branch
git checkout gh-pages
git log --oneline -5         # identify the previous good commit
git reset --hard <commit>    # reset to it
git push --force origin gh-pages
```

### If using Netlify or Vercel

Use the hosting dashboard to redeploy any previous deployment from the deploy history.

---

## Environment Variables

This app has **no required environment variables**. All storage is local SQLite.

---

## Build Verification Checklist

Before deploying:

- [ ] `npm run typecheck` passes with zero errors
- [ ] `npx expo export --platform web` completes without errors
- [ ] `dist/index.html` exists
- [ ] Open `dist/index.html` in a browser — app loads and database initializes
- [ ] Add an expense — it persists after page refresh
