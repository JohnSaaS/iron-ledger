# Iron Ledger

A push/pull/legs training log built for one-handed use in a gym.

- Opens on today's session, nothing else on screen
- Enter the weight once per lift, tap the set number you just finished
- Tapping a set starts that lift's rest timer, which survives backgrounding
- Form video for every exercise
- Weights are written to a private Google Sheet, so they sync across devices

## Setup

1. Open your tracker spreadsheet, then Extensions > Apps Script
2. Replace everything with the contents of `apps-script.gs`
3. Edit line 11 of `apps-script.gs` and change the `SECRET_TOKEN` to a random, hard to guess password. Save the file.
4. Deploy > New deployment > Web app
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the `/exec` URL
6. Open the app, tap **Sheet connection**, paste the URL and your secret token, then save

The URL and your secret token are stored in your browser only. They are never committed here.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app. No build step, no dependencies |
| `program.json` | 13 weeks of dated sessions and the exercise definitions |
| `apps-script.gs` | The Sheet backend you paste into Apps Script |

## Changing the program

Edit `program.json`. Each session is `{d, w, dl, t, lab, lng}` and each day type
lists exercises as `[name, sets, repRange, restSeconds, youtubeId, cue]`.
