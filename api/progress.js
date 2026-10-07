const json = require("../services/jsonService");

// Forward-test progress page data (2026-10-07, user asked for a shareable
// "are we on course for the 120-bet verdict?" page). Reads the same files
// the pipeline already syncs to json/ on every odds-refresh deploy, and
// settles exactly like js/weeklyForwardReport.js (voids excluded, LIVE-phase
// bets kept out of the paper record) so the page and the Monday report agree.

const VERDICT_BETS = 120;
const CANDIDATE_BETS = 100;
const COMMISSION = 0.05;               // Betfair, as in js/betList.js
const BACKTEST_EDGE = 0.02;            // Aug-Sep 2026 backtest, 180 bets
const HISTORY_EDGE = -0.048;           // 2,763-race historical test of the market rules
const CANDIDATE_STUDY_EDGE = 0.136;    // archive study for the candidate rule

const load = f => { try { return json.load(f); } catch { return null; } };

function decimal(b) {
    if (b.bsp > 1) return b.bsp;
    const s = String(b.isp || b.priceAtOff || b.price || "");
    if (/^evs|^evens/i.test(s)) return 2;
    const [n, d] = s.split("/").map(Number);
    return d ? n / d + 1 : null;
}

// Normal CDF (Abramowitz-Stegun), enough for a "chance of finishing above 0".
function phi(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
}

function summarise(bets, target, edges, startedAt) {
    const settled = bets
        .filter(b => b.pl != null && b.result !== "void")
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    const n = settled.length;
    const pl = settled.reduce((s, b) => s + b.pl, 0);
    const won = settled.filter(b => b.result === "won").length;
    const mean = n ? pl / n : 0;
    const sd = n > 1 ? Math.sqrt(settled.reduce((s, b) => s + (b.pl - mean) ** 2, 0) / (n - 1)) : 0.95;
    const half = n > 1 ? 1.96 * sd / Math.sqrt(n) : null;

    const prices = settled.map(decimal).filter(x => x > 1);
    const breakEven = prices.length
        ? prices.reduce((s, p) => s + 1 / (1 + (p - 1) * (1 - COMMISSION)), 0) / prices.length
        : null;

    const remaining = Math.max(0, target - n);
    const days = startedAt ? (Date.now() - new Date(startedAt).getTime()) / 86400000 : null;
    const perDay = days && n ? n / days : null;
    const eta = perDay && remaining ? new Date(Date.now() + remaining / perDay * 86400000).toISOString().slice(0, 10) : null;

    const scenarios = edges.map(([label, edge]) => {
        const expected = pl + remaining * edge;
        const spread = sd * Math.sqrt(remaining);
        return {
            label, edge,
            expectedPl: expected,
            expectedRoi: expected / target,
            chanceAboveZero: remaining ? 1 - phi(-expected / spread) : (pl > 0 ? 1 : 0)
        };
    });

    let running = 0;
    const path = settled.map((b, i) => {
        running += b.pl;
        return { n: i + 1, date: b.date, time: b.time, course: b.course, horse: b.horse, result: b.result, pl: b.pl, price: decimal(b), total: running };
    });

    return {
        target, settled: n, pending: bets.filter(b => b.pl == null).length,
        won, strike: n ? won / n : null, breakEvenStrike: breakEven,
        pl, roi: n ? mean : null,
        range: half != null ? [mean - half, mean + half] : null,
        neededToFinishLevel: remaining ? -pl / remaining : null,
        perDay, eta, scenarios, path
    };
}

module.exports = (req, res) => {

    res.setHeader("Cache-Control", "no-store");

    const tracker = load("bet_tracker.json");
    if (!tracker) return res.status(404).json({ success: false, error: "bet tracker not available" });

    const betList = summarise(
        (tracker.bets || []).filter(b => b.phase !== "LIVE"),
        VERDICT_BETS,
        [["Backtest edge (+2.0%)", BACKTEST_EDGE], ["No edge (0%)", 0], ["Historical test (−4.8%)", HISTORY_EDGE]],
        tracker.startedAt
    );

    const cand = load("candidate_tracker.json");
    const candidate = cand ? summarise(
        cand.bets || [],
        CANDIDATE_BETS,
        [["Archive study (+13.6%)", CANDIDATE_STUDY_EDGE], ["No edge (0%)", 0]],
        cand.startedAt
    ) : null;

    const shadow = load("matchbook_shadow.json") || {};
    const matchbook = {};
    for (const e of Object.values(shadow)) {
        if (!e.atReveal?.found) continue;
        (matchbook[e.type || "BET"] ??= []).push(e.atReveal.available);
    }
    for (const [type, avail] of Object.entries(matchbook)) {
        avail.sort((a, b) => a - b);
        matchbook[type] = { recorded: avail.length, medianAvailable: avail[avail.length >> 1], underTen: avail.filter(a => a < 10).length };
    }

    res.json({
        success: true,
        generatedAt: new Date().toISOString(),
        phase: tracker.phase,
        benchmarks: { backtest: BACKTEST_EDGE, history: HISTORY_EDGE, candidateStudy: CANDIDATE_STUDY_EDGE },
        betList, candidate, matchbook
    });

};
