# Bhillit

> *Move through your visit. Code with confidence.*

Bhillit is an offline-first web app that suggests an outpatient Evaluation
&amp; Management (E/M) CPT level from the 2026 **Medical Decision Making
(MDM)** elements: problems addressed, data reviewed/ordered, and risk of
management. It also flags common same-day add-on codes and the `-25`
modifier.

The interface is a guided multi-screen flow: a splash/onboarding screen, a
home screen with recent visits and quick start, a six-step coding wizard,
and a bottom navigation bar with History, Favorites, and Settings.

> **Disclaimer:** Educational reference only. It does not replace clinical
> judgement, certified coding review, or current CPT&reg;/CMS guidance. No
> patient data is collected, stored, or transmitted &mdash; everything runs
> locally in the browser.

## Features

- **Onboarding splash** with a short three-slide intro (shown once; re-open
  from Settings).
- **Home** with a time-based greeting, recent visits, and a one-tap
  "New Visit" / Quick Start.
- **Six-step wizard**: patient type &rarr; problems &rarr; data &rarr; risk
  &rarr; same-day extras &rarr; review. A live result card shows the running
  code; "Skip to Results" jumps straight to the review.
- The full MDM auto-calculation is preserved &mdash; tap chips to record
  problems/data/risk (counters increment on repeat taps, `&minus;` to undo),
  and the CPT code (`99202&ndash;99205` new / `99212&ndash;99215`
  established) is derived with the "2 of 3 MDM elements" rule, with a
  breakdown of which elements drove the level.
- Same-day extras (AWV, preventive visit, counseling codes) with `-25`
  modifier reminders.
- **History** tab: a benchmark comparison charting your MDM-level mix
  against an (editable, approximate) reference benchmark as two stacked bars
  plus a breakdown table, filterable by new/established, with per-visit and
  bulk delete.
- **Favorites** tab: bookmark visits from the review card or any list.
- **Settings**: default patient type, replay intro, clear all history.
- Visits are stored locally in the browser only; no patient data and
  nothing leaves the device.
- **Installable PWA** &mdash; works fully offline after the first load.

## Project structure

```
index.html      Markup and app shell
styles.css      Styles
app.js          UI rendering, MDM logic, service-worker registration
manifest.json   PWA metadata and icons
sw.js           Service worker (cache-first offline support)
icons/          App icons (SVG + PNG, incl. maskable)
```

## Running locally

A service worker requires an HTTP origin (it will not register from a
`file://` path). Serve the folder with any static server:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Load the page once while online; afterward it works offline. To install,
use your browser's "Add to Home Screen" / "Install app" option.

## Deploying

Any static host works (GitHub Pages, Netlify, etc.). All asset paths are
relative, so it can be served from a subdirectory without changes.

## Updating

The service worker precaches the app shell under a versioned cache name
(the `CACHE` constant in `sw.js`, currently `em-coder-v4`). When you change
any asset, bump that constant so clients fetch the new version and old
caches are purged.

The reference benchmark used by the coding-log comparison is the
`BENCHMARK` object near the top of `app.js`. Edit those per-level
percentages to match your own specialty/payer benchmark.
