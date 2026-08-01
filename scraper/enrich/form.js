// ============================================================================
// File: backend/scraper/enrich/form.js
// Description: Enriches runner form into structured statistics.
// Author: TVG TechBar / ChatGPT
// Version: 2.0.0
// ============================================================================

'use strict';

const { tokenizeForm } = require('./formTokenizer');
const { analyseForm } = require('./formAnalyser');

// ============================================================================
// Helpers
// ============================================================================

function average(values) {

    if (!values.length)
        return null;

    return values.reduce((a, b) => a + b, 0) / values.length;

}

function calculateConsistency(positions) {

    if (positions.length < 2)
        return 100;

    const avg = average(positions);

    const variance = positions.reduce(
        (sum, value) => sum + Math.pow(value - avg, 2),
        0
    ) / positions.length;

    return Math.max(0, Math.round(100 - (Math.sqrt(variance) * 15)));

}

function calculateMomentum(positions) {

    if (positions.length < 2)
        return 50;

    const half = Math.floor(positions.length / 2);

    const older = positions.slice(0, half);
    const recent = positions.slice(half);

    const oldAvg = average(older);
    const newAvg = average(recent);

    if (oldAvg === null || newAvg === null)
        return 50;

    const score = 50 + ((oldAvg - newAvg) * 15);

    return Math.max(0, Math.min(100, Math.round(score)));

}

// ============================================================================
// Public
// ============================================================================

function enrichForm(runner) {

    const raw = (runner.formsummary || '')
        .toUpperCase()
        .trim();

    const tokens = tokenizeForm(raw);

	const {
		positions,
		runs,
		wins,
		places,
		strikeRate,
		placeRate,
		olderAverage,
		recentAverage,
		trend,
		nonFinishers
	} = analyseForm(tokens);

    runner.form = {
		runs,
		strikeRate,
		placeRate,
		olderAverage,
		recentAverage,
		trend,
        raw,
        positions,
        wins,
        places,
        averageFinish: average(positions),
        bestFinish:
            positions.length
                ? Math.min(...positions)
                : null,
        worstFinish:
            positions.length
                ? Math.max(...positions)
                : null,
        lastRun:
            positions.length
                ? positions.at(-1)
                : null,
        consistency: calculateConsistency(positions),
        momentum: calculateMomentum(positions),
        nonFinishers
    };

    return runner;

}

module.exports = {

    enrichForm

};

// ============================================================================
// End of File
// ============================================================================