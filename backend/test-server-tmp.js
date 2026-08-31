const express = require("express");
const app = express();
const { renderRouteMap } = require("./services/route-map");
const routeMapCache = new Map();
app.get("/api/route-map", async (req, res) => {
  try {
    let stops;
    try { stops = JSON.parse(req.query.stops || "[]"); } catch { stops = null; }
    if (!Array.isArray(stops) || stops.length < 2) return res.status(400).json({ error: "need 2+ stops" });
    for (const s of stops) {
      if (typeof s.lat !== "number" || typeof s.lng !== "number") return res.status(400).json({ error: "bad lat/lng" });
    }
    const width = Math.min(1200, Math.max(300, parseInt(req.query.width, 10) || 800));
    const height = Math.min(1200, Math.max(300, parseInt(req.query.height, 10) || 560));
    const png = await renderRouteMap(stops, { width, height });
    res.setHeader("Content-Type", "image/png");
    res.send(png);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});
app.listen(5099, () => console.log("test server up on 5099"));
