// api/silk.js
//
// Proxies a sportinglife silk image through background removal and
// serves the cleaned, transparent PNG. Silk URLs are fully
// deterministic (built in a1cards.js from date + course code + race
// time + cloth number - see buildSilkUrl()), so the SAME silk can be
// requested many times across a race day; Cache-Control lets Vercel's
// edge (and the browser) serve repeat requests without re-processing.
//
// Usage from the frontend:
//   /api/silk?url=<encodeURIComponent(rawSportingLifeUrl)>
//
// Only ever fetches from sportinglife.com - this is a proxy for one
// specific known image host, not an open fetch-anything relay.

const axios = require("axios");
const { removeSilkBackground } = require("../backend/silkProcessor");

const ALLOWED_HOST = "www.sportinglife.com";

module.exports = async function handler(req, res) {

    const rawUrl = req.query?.url;

    if (!rawUrl || typeof rawUrl !== "string") {
        res.status(400).json({ error: "Missing url parameter." });
        return;
    }

    let parsed;

    try {
        parsed = new URL(rawUrl);
    } catch {
        res.status(400).json({ error: "Invalid url parameter." });
        return;
    }

    // Only ever proxy the one known silk host - this is not a general
    // fetch-any-URL relay, so refuse anything else outright.
    if (parsed.hostname !== ALLOWED_HOST) {
        res.status(400).json({ error: "URL host not allowed." });
        return;
    }

    try {

        const source = await axios.get(parsed.toString(), {
            responseType: "arraybuffer",
            timeout: 10000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        });

        const cleaned = await removeSilkBackground(
            Buffer.from(source.data)
        );

        // A silk filename is unique per date+course+time+cloth number
        // and never changes once published, so this is safe to cache
        // hard and long - a full race day, comfortably.
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400, immutable");
        res.status(200).send(cleaned);

    } catch (err) {

        // Silk missing/not-yet-published/host error - fail soft with
        // a 404 rather than a 500, so the frontend's existing
        // onerror="this.style.display='none'" handling on <img> tags
        // still works exactly as it does today for a raw missing silk.
        res.status(404).json({ error: "Silk not available." });

    }

};
