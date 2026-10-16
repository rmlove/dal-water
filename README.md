# Dallas Water Watch

A community tool for Dallas residents to track reported water issues in real time — main breaks, sewer problems, storm drainage complaints, water pollution, and construction activity — sourced live from the City of Dallas 311 Open Data API.

Built for neighbors who want to know what's happening with the water infrastructure on their street, in their neighborhood, or across their council district.

![Dallas Water Watch](https://img.shields.io/badge/data-Dallas%20311%20Open%20Data-blue) ![React](https://img.shields.io/badge/built%20with-React%20%2B%20TypeScript-61dafb) ![Vite](https://img.shields.io/badge/bundler-Vite-646cff)

---

## What it does

- **Live 311 data** — pulls directly from the [Dallas Open Data 311 dataset](https://www.dallasopendata.com/City-Services/311-Service-Requests-October-1-2020-to-Present/d7e7-envw) (updated daily), filtered to Dallas Water Utilities service request types
- **Interactive Google Map** — color-coded pins by incident category; click any pin for details including status, report date, close date, and council district
- **Address search** — enter any Dallas address or zip code to center the map and filter to incidents within 1, 3, or 5 miles
- **"Near me" button** — uses browser geolocation to instantly show incidents around your current location
- **Date range filter** — quick presets (7 / 30 / 90 days) or custom start/end dates
- **Category chips** — toggle Water Main Break, Sewer Problem, Water Pollution, Drainage / Storm Water, Construction, and Other Water independently
- **Incident list** — scrollable sidebar list synced with the map; click either to highlight the other
- **Shareable links** — all filters (date range, categories, location, radius) are encoded in the URL hash so you can share a direct link to your neighborhood's view
- **No-key preview mode** — works without a Google Maps API key using a dot-map fallback so residents can explore data immediately

---

## Incident categories

| Color | Category |
|-------|----------|
| 🔴 Red | Water Main Break |
| 🟣 Purple | Sewer Problem |
| 🟡 Yellow | Water Pollution |
| 🟢 Green | Drainage / Storm Water |
| 🔵 Teal | Water / Sewer Construction |
| ⚫ Gray | Other Water |

---

## Getting started locally

```bash
git clone https://github.com/rmlove/dal-water.git
cd dal-water
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app loads live Dallas 311 data immediately — no API key required to browse incidents.

---

## Google Maps API key

The app works in preview mode without a key (dot-map with all data intact), but for the full interactive Google Maps experience and address search:

1. Get a key at [https://developers.google.com/maps/get-started](https://developers.google.com/maps/get-started)
2. In the Google Cloud Console, enable the **Maps JavaScript API** for your project
3. Add the key one of two ways:

**Option A — Local dev (`.env.local`)**
```bash
cp .env.example .env.local
# Edit .env.local and set:
VITE_GOOGLE_MAPS_API_KEY=your-key-here
```
`.env.local` is gitignored and will never be committed. Restart `npm run dev` after adding it.

**Option B — In the browser sidebar**
Paste the key into the "Google Maps API key" section at the bottom of the sidebar. It is stored only in your browser's `localStorage` — never sent anywhere else.

> **Note:** Address search uses Google's built-in geocoder when a Maps key is present, and automatically falls back to [OpenStreetMap Nominatim](https://nominatim.org) when it isn't — so address search works in both modes.

---

## Data source

All incident data comes from the **Dallas 311 Service Requests (October 2020 – Present)** dataset on [Dallas Open Data](https://www.dallasopendata.com/City-Services/311-Service-Requests-October-1-2020-to-Present/d7e7-envw):

- Dataset ID: `d7e7-envw`
- Updated daily by the City of Dallas
- Queried via the [Socrata SODA API](https://dev.socrata.com/)
- Filtered to service request types matching Dallas Water Utilities keywords

To report a new issue yourself: [311.cityofdallas.org](https://311.cityofdallas.org)

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| UI framework | React 18 + TypeScript |
| Bundler | Vite |
| Map | Google Maps JavaScript API (`AdvancedMarkerElement`) |
| Geocoding | `google.maps.Geocoder` → Nominatim fallback |
| Data | Dallas Open Data SODA API |
| Styling | Plain CSS (no framework) |
| State | React hooks + URL hash for shareability |

---

## Scripts

```bash
npm run dev      # Start dev server at localhost:5173
npm run build    # Type-check + production build
npm run lint     # ESLint
npm run preview  # Preview the production build locally
```

---

## Contributing

This is a community tool. If you see data issues, have ideas for new features (council district overlays, email alerts, historical trend charts), or want to help deploy it publicly — open an issue or PR.

---

## License

MIT
