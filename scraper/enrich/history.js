'use strict';

// ============================================================================
// File: backend/scraper/enrich/history.js
// Module: History Enrichment
// Description: Calculates historical performance statistics.
// Project: Horse Racing Prediction Engine v3
// Author: TVG TechBar / ChatGPT
// Version: 3.0.1
// Last Modified: 2026-07-25
// ============================================================================


// ============================================================================
// Helper Functions
// ============================================================================

function buildRecord(history, field) {

    const record = {};

    for (const race of history) {

        const key = race[field];

        if (!key)
            continue;

        const position = getPosition(race);

        if (!record[key]) {

            record[key] = {
                runs: 0,
                wins: 0,
                places: 0
            };
        }

        record[key].runs++;

        if (position === 1)
            record[key].wins++;

        if (position <= 3)
            record[key].places++;
    }

    return record;
}

function getRating(race) {
    return race.official_rating ?? race.or ?? null;
}

function getPosition(race) {
    return race.pos ?? race.position ?? null;
}

// ============================================================================
// Public Functions
// ============================================================================

function enrich(runner) {

    const history = runner.past_results || [];
	
	
	let lowestOR = null;
	let currentOR = null;
	let lastWinDate = null;
	let daysSinceWin = null;

    let lastRunDate = null;
    let daysSinceRun = null;

    let totalOR = 0;
    let orCount = 0;
    let highestOR = 0;

    let wins = 0;
    let places = 0;

    let finishTotal = 0;
    let finishCount = 0;

    if (history.length > 0) {

        lastRunDate = history[0].date || null;

        if (lastRunDate) {

            const last = new Date(lastRunDate);

            daysSinceRun = Math.floor(
                (Date.now() - last.getTime()) / 86400000
            );
        }

        for (const race of history) {

			const rating = getRating(race);

			if (Number.isFinite(rating)) {

				if (currentOR === null)
					currentOR = rating;

				totalOR += rating;
				orCount++;

				if (highestOR === 0 || rating > highestOR)
					highestOR = rating;

				if (lowestOR === null || rating < lowestOR)
					lowestOR = rating;
			}

            const position = getPosition(race);

			if (Number.isFinite(position)) {

				finishTotal += position;
				finishCount++;

				if (position === 1) {

					wins++;

					if (!lastWinDate && race.date)
						lastWinDate = race.date;
				}

				if (position <= 3)
					places++;
			}

        }
    }

	if (lastWinDate) {

		const lastWin = new Date(lastWinDate);

		daysSinceWin = Math.floor(
			(Date.now() - lastWin.getTime()) / 86400000
		);
	}

	runner.history = {

		lastRunDate,
		daysSinceRun,

		lastWinDate,
		daysSinceWin,

		currentOR,
		averageOR: orCount ? Math.round(totalOR / orCount) : 0,

		highestOR,
		lowestOR,

		wins,
		places,

		averageFinish: finishCount
			? Number((finishTotal / finishCount).toFixed(2))
			: 0
	};

	runner.history.courseRecord = buildRecord(history, "course");
	runner.history.goingRecord = buildRecord(history, "going");
	runner.history.distanceRecord = buildRecord(history, "dist");
	runner.history.classRecord = buildRecord(history, "class");

    return runner;
}

// ============================================================================
// Module Exports
// ============================================================================

module.exports = {
    enrich
};