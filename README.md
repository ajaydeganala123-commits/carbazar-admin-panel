# CARBAZAR Admin Panel

React + Vite + TypeScript + Tailwind. Talks to the same Firebase project as the Flutter app (`aimodel-ba509`).

## First-time setup

```bash
cd admin
npm install
```

## Bootstrap an admin account

Admins are identified by the existence of an `admins/{uid}` doc. To self-promote your first admin (FYP-grade — production seeds via the Firebase console):

1. In the Flutter app, sign in with the account you want to make an admin.
2. Go to **Profile → Dev tools → Make me an admin** (debug builds only).
3. The Firestore rule allows you to create your own `admins/{your-uid}` doc.

## Run

```bash
npm run dev
```

Visit `http://localhost:5174`. Sign in with the email + password of the account you bootstrapped.

## Build

```bash
npm run build
```

Outputs to `dist/`. Deploy anywhere (Firebase Hosting, Netlify, Vercel, GitHub Pages).

## What's included

| Page | What it shows |
|---|---|
| `/` Dashboard | Live KPI cards (users, listings, live auctions, GMV) + recent listings feed |
| `/users` | Search, filter, verify, block, unblock users |
| `/listings` | Search, filter, block / restore / hard-delete listings |
| `/auctions` | Live monitor of active auctions with current bid + countdown |

All data is live (Firestore `onSnapshot`). No refresh button needed — flips happen instantly.
