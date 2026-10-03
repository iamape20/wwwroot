const json = require("../services/jsonService");
const { Redis } = require("@upstash/redis");

// Serves the bet list written by the root pipeline's js/betList.js (every
// odds refresh). Never cached - the horse is revealed only shortly before
// each off, so a stale copy would hide or delay a bet.
//
// Redis first (2026-10-03): betList.js also writes it to betlist:latest, so
// a reveal is live within seconds instead of waiting for a Vercel deploy
// (the deployed json/bet_list.json lagged ~10 min on 3 Oct, long enough
// for a bet to be revealed and its race run before it showed). Whichever
// copy is newer wins; the deployed file is the fallback.
let redis = null;
try { redis = Redis.fromEnv(); } catch { redis = null; }

module.exports = async (req, res) => {

    res.setHeader("Cache-Control", "no-store");

    let fromFile = null;
    try { fromFile = json.load("bet_list.json"); } catch { fromFile = null; }

    let fromRedis = null;
    if (redis) {
        try { fromRedis = await redis.get("betlist:latest"); } catch { fromRedis = null; }
    }

    const newer = [fromRedis, fromFile]
        .filter(x => x && x.generatedAt)
        .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt))[0];

    if (!newer) {
        return res.status(404).json({ success: false, error: "bet list not available" });
    }

    res.json({ success: true, ...newer });

};
