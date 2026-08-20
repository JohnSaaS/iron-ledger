# Iron Ledger

A push/pull/legs training log built for one-handed use in a gym.

- Opens on today's session, nothing else on screen
- Enter the weight once per lift, tap the set number you just finished
- Tapping a set starts that lift's rest timer, which survives backgrounding
- Form video for every exercise
- Weights are written to a private Google Sheet, so they sync across devices

## Setup

1. Open your tracker spreadsheet, then Extensions > Apps Script
2. Replace everything with the contents of `apps-script.gs`, save
3. Deploy > New deployment > Web app
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the `/exec` URL
5. Open the app, tap **Sheet connection**, paste the URL, save

The URL is stored in your browser only. It is never committed here.

## Phone Access & Offline Mode

Iron Ledger is a true Progressive Web App (PWA) with offline capabilities.

1. Host these files anywhere (GitHub Pages, Netlify, Vercel, or a local server).
2. Open the URL in Safari (iOS) or Chrome (Android).
3. Tap **Share** > **Add to Home Screen** (iOS) or **Install App** (Android).
4. The app will now open full-screen and work offline! If you log a workout without an internet connection, it saves locally and syncs back to your Google Sheet automatically once your connection is restored.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app. No build step, no dependencies |
| `program.json` | 13 weeks of dated sessions and the exercise definitions |
| `apps-script.gs` | The Sheet backend you paste into Apps Script |

## Changing the program

Edit `program.json`. Each session is `{d, w, dl, t, lab, lng}` and each day type
lists exercises as `[name, sets, repRange, restSeconds, youtubeId, cue]`.
