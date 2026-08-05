# LM Production Tracker — Project Reference

## What this is
A multi-dashboard production tracking system for Evergreen Studio's manufacturing floor.
Built around Firebase Realtime Database so all devices share live data.
Three separate web apps share the same Firebase project.

## Who uses it
- **Operators** (production floor): Use the operator tracker to log runs, maintenance, waiting time, and stamped pieces.
- **Managers**: Use the manager dashboard for a read-only overview of all machines in real time.
- Non-technical users — UI must stay simple and self-explanatory.

## How to run it locally
Double-click `serve.bat` then open in a browser:
- Operator Tracker:     `http://localhost:8080`
- Manager Dashboard:    `http://localhost:8080/manager/`
- Production Dashboard: `http://localhost:8080/dashboard/`
Requires Python 3 (included in Windows 11).

---

## Dashboard 1: Operator Tracker (root)

### Entry point
`index.html` — loads CSS and all JS modules in dependency order.

### What operators do
- Log print runs (stop/go or continuous mode) with timers, quantities (good/bad), changeovers
- Log maintenance events (mechanical fix/down, cleaning with checklist, defective material tally)
- Track wait time (idle timer)
- Log stamped pieces (tally + misprint counter)
- View production reports and export to Excel
- Open PrintLog app (https://egstudiolog.netlify.app/) via button in production reports toolbar
- View open orders imported from warehouse spreadsheet

### File structure
```
index.html              — HTML shell, all body markup, script/link tags
css/styles.css          — All styling (green/pink brand palette)
js/firebase.js          — Firebase init, auth (type="module"), window._fb API
js/constants.js         — MACHINES, PIECE_TYPES, STATUSES, CLEANING_CHECKLISTS, TABLE_CAPACITY_DEFAULTS, etc.
js/state.js             — Mutable global state variables (run state, timers, logs, etc.)
js/utils.js             — fmt(), fmtDate(), openModal(), closeModal(), esc(), date helpers
js/oee.js               — getIdealCycle(), calcOEE(), calcEfficiency(), color helpers
js/timers.js            — transState, transitionToggle/Stop/stopAll, resyncAllTimers
js/storage.js           — localSaveSession(), localSaveMachineEvent(), localLoadData()
js/printing.js          — Quick start flow, run control (changeover, pause, stop), wait timer
js/maintenance.js       — Mechanical, cleaning (checklist), defective, maint log & reports
js/stamped.js           — Stamped mode tally, misprint, save/reset
js/reports.js           — renderReports(), export to Excel, card detail modal, hourly chart
js/orders.js            — Open orders import (XLSX upload), renderOpenOrders()
js/settings.js          — Efficiency targets table, OEE cycle time settings, updateTopCounters()
js/app.js               — init(), switchView(), renderGrid(), selectMachine(), DOMContentLoaded
```

### Key data flows
- **Auth**: Passcode → Firebase email auth (team@printtrack.internal). `window._fb` is set only after login.
- **Sessions**: Each print run creates a session in Firebase at `sessions/{machine}`.
- **Live state**: Active run state written to `liveState/{machine}` so manager dashboard sees it.
- **Targets**: Stored in Firebase at `targets/`, cached in `window._targets`.
- **Local fallback**: All sessions also saved to localStorage as backup.

### Machines tracked
30, 30+, H5, Colex, Drinkware, Wallets

### Print modes
- Stop/Go (Full Color or One Color) — qty logged per changeover
- Continuous (Full Color or One Color) — qty logged at end of run

---

## Dashboard 2: Manager Dashboard (`manager/`)

### Entry point
`manager/index.html` — loads Chart.js CDN, Firebase module, and app JS.

### What managers see
- Live machine grid: all machines at a glance, current run status, OEE, efficiency
- Live timers for active runs (synced via Firebase `liveState/`)
- Drilldown per machine: sessions, maintenance log, wait log, hourly chart
- Activity feed: recent events across all machines
- Summary bar: total pieces printed/stamped, machines active, avg OEE
- Date range filtering (today, yesterday, last 7 days, custom)
- Machine visibility toggles

### File structure
```
manager/index.html       — HTML shell with all body markup
manager/css/styles.css   — All manager-specific styling
manager/js/firebase.js   — Firebase init, auth, ALL data listeners + render functions
```

### Key architectural note
The manager dashboard's Firebase module is heavier than the operator tracker's — all data
listening AND rendering is handled inside the ES6 module (unlike the operator tracker which
exposes `window._fb` for the plain scripts to use). This is intentional — the manager
dashboard is read-only and all logic fits cleanly in one file.

### PWA / home-screen install
The Operator Tracker is installable to a phone home screen as a standalone app (added 2026-07-24):
- `manifest.json` (root) — name, icons, `display: standalone`, theme/background color
- `icons/icon-192.png`, `icons/icon-512.png` — generated from the embedded favicon logo (only
  108x72 source resolution, padded onto a white square — revisit with a higher-res logo file
  if a crisper icon is ever wanted)
- `sw.js` — minimal service worker, caches only the same-origin static shell (HTML/CSS/JS/icons)
  under `CACHE_NAME`. Firebase calls, Google Fonts, and the XLSX CDN script are deliberately
  left alone and always hit the network — never served from cache.
- **Whenever you change `index.html`, `css/styles.css`, or any `js/*.js` file, bump `CACHE_NAME`
  in `sw.js`** (e.g. `printtrack-shell-v1` → `v2`) — otherwise phones with the app already
  installed may keep serving the old cached version after a deploy.
- Manager Dashboard and Production Dashboard do not have this yet — same pattern can be repeated
  for `manager/` and `dashboard/` if wanted later.

---

## Shared Firebase project
Both dashboards connect to the same Firebase project:
- Project: `eg-studio-production-tracker`
- Auth: Single shared passcode → `team@printtrack.internal`
- Database paths used:
  - `sessions/{machine}` — print run sessions
  - `liveState/{machine}` — active run live state
  - `maintLog` — maintenance events
  - `waitLog` — wait time events
  - `shiftLog/{date}` — shift start/end events
  - `targets` — efficiency/OEE targets
  - `openOrders` — warehouse orders data
  - `checklistProgress` — cleaning checklist state
  - `machineEvents/{machine}` — machine-level events
  - ~~`printFiles`~~ — removed; print file logging moved to PrintLog app

---

## Brand & design
- Company: Evergreen Studio
- App: PrintTrack
- Primary green: `#52a040` / `#c2e8b8`
- Accent pink: `#e8457a`
- Fonts: Abril Fatface (headings), Josefin Slab (labels), Libre Franklin (body)
- Logo: base64-embedded PNG in index.html

---

## Rules for Claude Code sessions

1. **Never change functionality when asked to fix styling** — and vice versa.
2. **The operator tracker and manager dashboard are separate apps.** Changes to one do not automatically apply to the other.
3. **Both share the same Firebase schema.** If you change a data path in one app, check the other.
4. **The Firebase config (apiKey, etc.) is intentionally in the source.** It's protected by Firebase security rules, not secrecy.
5. **Test in the browser after every change.** Run serve.bat and check both dashboards.
6. **Commit after every working change** with a clear message.
7. **A third dashboard may be added in the future.** Keep the project structure consistent.
8. **When in doubt, ask.** The operator workflow has specific reasons for every design decision.

---

## Dashboard 3: Production Dashboard (`dashboard/`)

### Entry point
`dashboard/index.html` — loads XLSX CDN, CSS, and JS module.

### What this shows
A compact, always-on TV/monitor display. No auth required — reads Firebase directly.
- Sidebar: total printed today, total stamped today, open orders + FBA breakdown (loaded from XLSX upload), date/time
- Hourly production bar chart (today, 6am–9pm, per machine, drawn on Canvas — no Chart.js)
- Machine cards grid: today's OEE (A/P/Q), run time, tables, good/bad units; hides machines with no data
- Previous day summary: department totals (Printing, Stamped, Windchimes) + per-machine breakdown with piece type rows

### File structure
```
dashboard/index.html      — HTML shell
dashboard/css/styles.css  — All styling (dark forest green palette, sidebar layout)
dashboard/js/app.js       — Firebase init + all logic as ES6 module (no auth, read-only)
```

### Key differences from other dashboards
- **No authentication** — designed for a TV or always-on display; Firebase rules protect write access
- **No Chart.js** — hourly chart is hand-drawn on an HTML Canvas element
- **Self-contained** — all logic in one ES6 module file; no separate firebase.js
- **Auto-refresh** every 5 minutes via `setInterval`
- **Open orders via file upload** — user drops an XLSX file; parsed client-side with SheetJS

---

## Deployment
- **Live URL**: https://egstudiotrack.netlify.app/
- **Platform**: Netlify (drag-and-drop deploy)
- **Deploy folder**: `deploy/` — contains only the files Netlify needs (no source monoliths, no .git, no .claude)
- **To deploy**: drag the `deploy/` folder onto the Netlify site's Deploys tab
- **Update deploy folder**: copy changed files from their source location into `deploy/` before dragging to Netlify

## Related projects
- **PrintLog** (`https://egstudiolog.netlify.app/`) — separate app for logging print files; linked from the operator tracker's production reports toolbar

## Known context
- Built iteratively in Claude.ai over many sessions before being migrated to Claude Code
- Original monolithic files preserved as `print-tracker (43).html`, `printtrack-manager (13).html`, and `eg-studio-dashboard-fixed (1).html`
- Non-technical owner — explanations should be in plain English
