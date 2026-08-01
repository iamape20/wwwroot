'use strict';
// ./formProfileEngine.js
//
// Converts a runner's raw `formsummary` string (e.g. "3434-24") into the
// structured `form` object formEngine.js expects. This is a first-pass
// heuristic for momentum/consistency — worth backtesting and tuning once
// v3 has been running for a while, not treated as final.

const NON_FINISH_CODES = new Set([
    "F", "P", "U", "R", "B", "BD", "UR", "RO", "REF", "DSQ", "CO"
]);

function parseFormString(formsummary) {

    if (!formsummary || formsummary === "-")
        return { positionsRecentFirst: [], nonFinishers: 0, runs: 0 };

    // Strip season-boundary punctuation, keep the run sequence
    // oldest-to-most-recent (left to right), then reverse to recent-first.
    const chars = formsummary
        .replace(/[-/]/g, "")
        .toUpperCase()
        .split("");

    const positions = [];
    let nonFinishers = 0;

    for (const ch of chars) {

        if (NON_FINISH_CODES.has(ch)) {
            nonFinishers++;
            continue;
        }

        if (/[0-9]/.test(ch)) {
            // '0' conventionally means 10th-or-worse
            positions.push(ch === "0" ? 10 : Number(ch));
        }

        // Anything else (letters not in NON_FINISH_CODES, e.g. rare codes)
        // is skipped rather than guessed at.

    }

    return {
        positionsRecentFirst: positions.reverse(),
        nonFinishers,
        runs: positions.length + nonFinishers
    };

}

function average(arr) {
    if (!arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function buildFormProfile(runner) {

    const { positionsRecentFirst, nonFinishers, runs } =
        parseFormString(runner.formsummary);

    if (runs === 0) {
        return {
            raw: runner.formsummary || "Unknown",
            runs: 0,
            wins: 0,
            places: 0,
            strikeRate: 0,
            placeRate: 0,
            nonFinishers: 0,
            lastRun: null,
            trend: "Unknown",
            momentum: 50,
            consistency: 50,
            positions: []
        };
    }

    const wins = positionsRecentFirst.filter(p => p === 1).length;
    const places = positionsRecentFirst.filter(p => p === 2 || p === 3).length;

    const strikeRate = Math.round((wins / runs) * 100);
    const placeRate = Math.round(((wins + places) / runs) * 100);

    const lastRun = positionsRecentFirst[0] ?? null;

    // Trend: compare the most recent couple of runs to the ones before.
    const recentAvg = average(positionsRecentFirst.slice(0, 2));
    const olderAvg = average(positionsRecentFirst.slice(2, 5));

    let trend = "Stable";
    if (recentAvg != null && olderAvg != null) {
        if (recentAvg < olderAvg - 1) trend = "Improving"; // lower position = better
        else if (recentAvg > olderAvg + 1) trend = "Declining";
    }

    // Momentum: weighted toward recent runs, inverted so 1st place -> high score.
    const momentumRaw = positionsRecentFirst
        .slice(0, 5)
        .map((p, i) => Math.max(0, 100 - (p - 1) * 15) * (1 - i * 0.15))
        .reduce((a, b) => a + b, 0);
    const momentumWeight = positionsRecentFirst
        .slice(0, 5)
        .map((_, i) => (1 - i * 0.15))
        .reduce((a, b) => a + b, 0);
    const momentum = momentumWeight > 0
        ? Math.round(momentumRaw / momentumWeight)
        : 50;

    // Consistency: lower variance in recent finishing positions -> higher score.
    const sample = positionsRecentFirst.slice(0, 6);
    let consistency = 50;
    if (sample.length >= 2) {
        const mean = average(sample);
        const variance = average(sample.map(p => (p - mean) ** 2));
        consistency = Math.max(0, Math.round(100 - variance * 8));
    }

    return {
        raw: runner.formsummary || "Unknown",
        runs,
        wins,
        places,
        strikeRate,
        placeRate,
        nonFinishers,
        lastRun,
        trend,
        momentum,
        consistency,
        positions: positionsRecentFirst
    };

}

module.exports = {
    build: buildFormProfile
};
