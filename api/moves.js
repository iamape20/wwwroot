const json = require("../services/jsonService");

// Market movers and non-runners for the home page strips (2026-10-11). Built
// every odds refresh by js/buildMarketMoves.js and synced to json/. Reports what
// the bookmaker market did; it is not a tip.
//
// The feed is rebuilt every ~20 minutes, so a race can go off between rebuilds.
// Rows for races already off are dropped here at request time (card times are UTC).

module.exports = (req, res) => {

    res.setHeader("Cache-Control", "no-store");

    try {
        const m = json.load("market_moves.json");
        const date = String(m.generatedAt || "").slice(0, 10);
        const now = Date.now();
        const stillToRun = x => !date || !x || !x.time || Date.parse(`${date}T${x.time}:00Z`) > now;
        res.json({
            success: true,
            generatedAt: m.generatedAt,
            date,
            shorteners: (m.shorteners || []).filter(stillToRun),
            drifters: (m.drifters || []).filter(stillToRun),
            nonRunners: (m.nonRunners || []).filter(stillToRun)
        });
    } catch {
        res.json({ success: true, generatedAt: null, date: null, shorteners: [], drifters: [], nonRunners: [] });
    }

};
