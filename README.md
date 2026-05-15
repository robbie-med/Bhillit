# E/M Coder

An offline-first web app that suggests an outpatient Evaluation &amp;
Management (E/M) CPT level from the 2026 **Medical Decision Making (MDM)**
elements: problems addressed, data reviewed/ordered, and risk of management.
It also flags common same-day add-on codes and the `-25` modifier.

> **Disclaimer:** Educational reference only. It does not replace clinical
> judgement, certified coding review, or current CPT&reg;/CMS guidance. No
> patient data is collected, stored, or transmitted &mdash; everything runs
> locally in the browser.

## Features

- Tap chips to record problems, data, and risk; counts increment on repeat taps.
- Live CPT code (`99202&ndash;99205` new / `99212&ndash;99215` established) using the
  "2 of 3 MDM elements" rule.
- Expandable breakdown showing which elements drove the level.
- Same-day extras (AWV, preventive visit, counseling codes) with `-25`
  modifier reminders.
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
(`em-coder-v1` in `sw.js`). When you change any asset, bump the `CACHE`
constant so clients fetch the new version and old caches are purged.
