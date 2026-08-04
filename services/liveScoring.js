// backend/services/liveScoring.js
//
// Live re-scoring: raceService.js reads the static, once-a-day
// final_ratings.json for most of a runner's checklist breakdown, but
// checks Upstash KV for odds history that's genuinely newer than
// that file - if a horse has steamed or drifted since the morning
// pipeline ran, this recomputes just the marketMove category and the
// resulting overall rating, live, at request time. No local re-run
// needed for market movement to actually show up on the site.
//
// IMPORTANT: parseFractionalOdds() and the market-move comparison
// logic below must be kept in sync with scoreMarketMove() in the
// real checklistEngine.js (project root, local pipeline only - not
// deployed to Vercel, so can't be required directly from here).
// This is a deliberately narrow, small duplication - not the whole
// engine - specifically to minimise the drift risk that duplicating
// a bigger system would carry.

const MARKET_MOVE_THRESHOLD = 0.15;

function parseFractionalOdds(value) {

    if (typeof value !== "string") return null;

    const clean = value.trim().toLowerCase();

    if (clean === "evens" || clean === "evs") return 1;

    const fractionMatch = clean.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) return Number(fractionMatch[1]) / Number(fractionMatch[2]);

    const whole = Number(clean);
    return isNaN(whole) ? null : whole;

}

function computeLiveMarketMove(oddsHistory, horseName) {

    if (!oddsHistory?.snapshots?.length || oddsHistory.snapshots.length < 2)
        return null; // no fresher signal available - caller should keep the static value

    const horseKey = String(horseName || "").toUpperCase();

    const withThisHorse = oddsHistory.snapshots
        .filter(s => s.odds && s.odds[horseKey])
        .sort((a, b) => a.time - b.time);

    if (withThisHorse.length < 2) return null;

    const earliest = withThisHorse[0];
    const latest = withThisHorse[withThisHorse.length - 1];

    const earliestDecimal = parseFractionalOdds(earliest.odds[horseKey]);
    const latestDecimal = parseFractionalOdds(latest.odds[horseKey]);

    if (earliestDecimal == null || latestDecimal == null) return null;

    const relativeChange = (earliestDecimal - latestDecimal) / earliestDecimal;
    const evidence = `${earliest.odds[horseKey]} → ${latest.odds[horseKey]} (${withThisHorse.length} snapshots, live)`;

    if (relativeChange >= MARKET_MOVE_THRESHOLD) {
        return { points: 1, max: 1, answer: "Steamer", evidence };
    }

    if (relativeChange <= -MARKET_MOVE_THRESHOLD) {
        return { points: 0, max: 1, answer: "Drifter", evidence };
    }

    return { points: 0, max: 1, answer: "Steady", evidence };

}

// Replaces one category in an existing breakdown and recomputes the
// overall rating from the updated total - generic, not specific to
// marketMove, so the same helper could apply an override for any
// future live category too.
function overrideCategory(breakdown, categoryKey, newCategoryData) {

    if (!breakdown || !newCategoryData) return null;

    const updatedBreakdown = { ...breakdown, [categoryKey]: newCategoryData };

    let earnedPoints = 0;
    let maxPoints = 0;

    for (const category of Object.values(updatedBreakdown)) {
        earnedPoints += category.points;
        maxPoints += category.max;
    }

    const rating = maxPoints > 0
        ? Number(((earnedPoints / maxPoints) * 100).toFixed(1))
        : 0;

    return { rating, earnedPoints, maxPoints, breakdown: updatedBreakdown };

}

function isNonRunner(oddsHistory, horseName) {

    if (!oddsHistory?.nonRunners?.length) return false;

    return oddsHistory.nonRunners.includes(String(horseName || "").toUpperCase());

}

module.exports = {
    computeLiveMarketMove,
    overrideCategory,
    isNonRunner
};
