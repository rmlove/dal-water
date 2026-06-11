# Dallas Water Watch

A community map of reported water issues in Dallas — leaks, main breaks,
water waste, pressure problems, water quality complaints, and drainage/storm
water issues — sourced live from the [Dallas Open Data 311 Service Requests](https://www.dallasopendata.com/resource/wwr9-8ha7.json) API.

## Features

- Live data pulled from the Dallas 311 SODA API, filtered to water-related
  service request types
- Adjustable date range (defaults to the last 90 days)
- Category filter chips (leak, main break, waste, pressure, quality, drainage)
- Address search with a 3-mile radius filter (requires a Google Maps API key
  for geocoding)
- Interactive Google Map with color-coded pins and info windows, or a
  dependency-free preview map if no API key is configured
- Incident list synced with the map — click either to highlight the other

## Getting started

```bash
npm install
npm run dev
```

## Google Maps API key

The app works without a key (it falls back to a simple preview map), but for
the full interactive map and address search:

1. Get a key at https://developers.google.com/maps/documentation/javascript/get-api-key
   - Enable the **Maps JavaScript API** and **Geocoding API**
2. Paste it into the "Google Maps API key" section in the app's sidebar

The key is stored only in your browser's `localStorage`.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run ESLint
