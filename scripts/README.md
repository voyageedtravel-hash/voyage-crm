# scripts/

Utility scripts that generate content baked into the app. Not run at build
time — run manually when the underlying data or region list changes, then
commit the regenerated output.

## build-map-outlines.js

Rebuilds the `COUNTRY_OUTLINES` constant in
`frontend/src/v2/V2Pages.js` used by the SVG-fallback route map (the map
shown on proposal PDFs when no Mapbox token is configured).

Source data: [Natural Earth 50m](https://www.naturalearthdata.com/) via the
`world-atlas` npm package (public domain). Simplified with
`topojson-simplify`, tiny islets dropped, coordinates rounded to 2 decimals.

### Run

```bash
cd scripts
npm init -y  # if node_modules not present
npm install world-atlas@2.0.2 topojson-client@3.1.0 topojson-simplify@3.0.3
node build-map-outlines.js  # writes outlines.js in the same folder
```

Then paste the emitted `outlines.js` content over the `COUNTRY_OUTLINES = {...}`
block in `V2Pages.js`. Verify total path bytes stay under ~30 KB — anything
larger and you should raise the simplification `weight` for oversized regions.

### Add a new region

1. Add an entry to the `REGIONS` array at the bottom of the script:
   `{ name: 'japan', countries: ['Japan'], weight: 0.05 }`
2. If cities in that region need custom bounds (e.g. to include a stop just
   outside the natural country boundary), set `boundsOverride`.
3. If the region should include multiple countries (e.g. a European tour, a
   Caucasus region grouping Georgia + Armenia + Azerbaijan), list them all in
   `countries` and set `boundsOverride` to the frame you want.
4. Add the same region to the keyword regex in
   `detectMapRegionV2` in `V2Pages.js` so trips get routed to it.
5. Add matching entries to `CITY_COORDS` for any new destination cities.
6. Rerun the script and paste the result.
