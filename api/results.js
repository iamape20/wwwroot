const json = require("../services/jsonService");

// Results page data (2026-10-11): every race on our card for the last 14 days,
// with our published pick, how it finished, the winner and the full finishing
// order. Built by js/buildResultsFeed.js (root pipeline) and synced to json/.
//
//   /api/results               -> list of days with their summary line
//   /api/results?date=YYYY-MM-DD -> that day's races

module.exports = (req, res) => {

    res.setHeader("Cache-Control", "no-store");

    let feed;
    try { feed = json.load("results_feed.json"); }
    catch { return res.status(404).json({ success: false, error: "results not available" }); }

    const date = String(req.query?.date || "");

    if (!date) {
        // Per-course record over the whole window (races with a scored pick only).
        const byCourse = {};
        for (const d of feed.days || []) {
            for (const r of d.races || []) {
                if (r.outcome !== "won" && r.outcome !== "placed" && r.outcome !== "unplaced") continue;
                const c = byCourse[r.course] || (byCourse[r.course] = { course: r.course, picked: 0, won: 0, placed: 0 });
                c.picked++;
                if (r.outcome === "won") c.won++;
                if (r.outcome === "won" || r.outcome === "placed") c.placed++;
            }
        }
        const courses = Object.values(byCourse).sort((a, b) => b.picked - a.picked || a.course.localeCompare(b.course));
        return res.json({
            success: true,
            generatedAt: feed.generatedAt,
            days: (feed.days || []).map(d => ({ date: d.date, summary: d.summary })),
            courses
        });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: "date must be YYYY-MM-DD" });
    }

    const day = (feed.days || []).find(d => d.date === date);
    if (!day) return res.status(404).json({ success: false, error: "no results for that date" });

    res.json({ success: true, generatedAt: feed.generatedAt, day });

};
