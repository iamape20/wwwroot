const json = require("../services/jsonService");

// Market movers and non-runners for the home page strips (2026-10-11). Built
// every odds refresh by js/buildMarketMoves.js and synced to json/. Reports what
// the bookmaker market did; it is not a tip.

module.exports = (req, res) => {

    res.setHeader("Cache-Control", "no-store");

    try {
        const m = json.load("market_moves.json");
        res.json({
            success: true,
            generatedAt: m.generatedAt,
            shorteners: m.shorteners || [],
            drifters: m.drifters || [],
            nonRunners: m.nonRunners || []
        });
    } catch {
        res.json({ success: true, generatedAt: null, shorteners: [], drifters: [], nonRunners: [] });
    }

};
