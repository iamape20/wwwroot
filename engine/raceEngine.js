'use strict';
// ./engine/raceEngine.js

const fs = require("fs");
const path = require("path");

const predictor = require("../engine-v2/predictor");
const formProfileEngine = require("../formProfileEngine");
const checklistEngine = require("../checklistEngine");

const DEFAULT_HORSE_DIR = path.join(__dirname, "..", "json", "horses");
const DEFAULT_TRAINER_DIR = path.join(__dirname, "..", "json", "trainers");
const DEFAULT_JOCKEY_DIR = path.join(__dirname, "..", "json", "jockeys");

function getHistoricalRuns(pastResults, asOfDate) {

    if (!Array.isArray(pastResults)) {
        return [];
    }

    return pastResults.filter(r => {

        if (!r?.date) {
            return false;
        }

        const d = new Date(r.date);

        return !isNaN(d.getTime()) && d <= asOfDate;

    });

}

function loadJsonFile(dir, id) {

    const file = path.join(dir, `${id}.json`);

    if (!fs.existsSync(file)) return null;

    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
        return null;
    }

}

function computeDaysSinceRun(dateStr, asOfDate) {

    if (!dateStr) return null;

    const then = new Date(dateStr);
    if (isNaN(then.getTime())) return null;

    return Math.round((asOfDate - then) / 86400000);

}

function buildHistory(pastResults, daysSinceRun) {

    if (!pastResults || !pastResults.length) return null;

    const positions = pastResults
        .map(r => r.pos)
        .filter(p => typeof p === "number" && p > 0);

    const ratings = pastResults
        .map(r => r.official_rating)
        .filter(v => typeof v === "number");

    const wins = positions.filter(p => p === 1).length;
    const places = positions.filter(p => p === 2 || p === 3).length;

    return {

        averageOR: ratings.length
            ? Math.round(
                ratings.reduce((a, b) => a + b, 0) / ratings.length
            )
            : null,

        wins,
        places,

        averageFinish: positions.length
            ? Number(
                (
                    positions.reduce((a, b) => a + b, 0) /
                    positions.length
                ).toFixed(1)
            )
            : null,

        daysSinceRun

    };

}

// dataDirs lets backtest.js point this at an archived snapshot instead
// of the live json/horses + json/trainers folders, while running the
// exact same logic that's actually used in production.
async function analyseRace(meeting, dataDirs = {}, categoryFilter = null) {

    const horseDir = dataDirs.horseDir || DEFAULT_HORSE_DIR;
    const trainerDir = dataDirs.trainerDir || DEFAULT_TRAINER_DIR;
    const jockeyDir = dataDirs.jockeyDir || DEFAULT_JOCKEY_DIR;

    // Anchor time-relative calculations to the race date.
    const asOfDate = new Date(meeting.date);

    for (const race of meeting.races) {

        // ------------------------------------------------------------
        // LOAD HORSE DATA
        // ------------------------------------------------------------

        for (const runner of race.runners) {

			const horseData = loadJsonFile(horseDir, runner.id);
			if (horseData?.past_results?.length) {
				runner.past_results = horseData.past_results;
			}

			// Recalculate exposure from historical data rather than trusting
			// the stale Stage 2 flag.
			const historicalRuns =
				getHistoricalRuns(
					runner.past_results,
					asOfDate
				);

			runner.historical_runs = historicalRuns.length;

			runner.is_unexposed =
				historicalRuns.length < 3;

			const lastRunBeforeRace = historicalRuns[0];

            if (lastRunBeforeRace) {

                runner.days_since_run =
                    computeDaysSinceRun(
                        lastRunBeforeRace.date,
                        asOfDate
                    );

                runner.last_run_date_used =
                    lastRunBeforeRace.date;

            }

            runner.history =
                buildHistory(
                    runner.past_results,
                    runner.days_since_run
                );

            runner.form =
                formProfileEngine.build(runner);

        }

        // ------------------------------------------------------------
        // FIELD OR
        // ------------------------------------------------------------

        const fieldORs = race.runners
            .map(r => {

                const withOR =
                    (r.past_results || [])
                        .find(
                            p =>
                                typeof p.official_rating === "number"
                        );

                return withOR
                    ? withOR.official_rating
                    : null;

            })
            .filter(v => v != null);

        race.highestOR =
            fieldORs.length
                ? Math.max(...fieldORs)
                : null;

        // ------------------------------------------------------------
        // V2 PREDICTION
        // ------------------------------------------------------------

        const prediction =
            predictor.predictRace(race);

        // ------------------------------------------------------------
        // APPLY BOTH MODELS
        // ------------------------------------------------------------

        for (const result of prediction.runners) {

            const runner = result.runner;

            // ========================================================
            // V2 MODEL
            // ========================================================

            runner.v2_score = result.score;

            // V2 becomes the PRIMARY production rating.
            runner.power_rating = result.score;

            runner.confidence =
                result.confidence.score;

            runner.confidence_grade =
                result.confidence.grade;

            runner.rating_breakdown =
                result.breakdown;

            runner.engine_details =
                result.engines;

            // ========================================================
            // CHECKLIST MODEL
            // ========================================================

            const trainerData =
                loadJsonFile(
                    trainerDir,
                    runner.trainer_id
                );

            const jockeyData =
                loadJsonFile(
                    jockeyDir,
                    runner.jockey_id
                );

            const checklist =
                checklistEngine.calculateChecklistRating(
                    runner,
                    {
                        race_class: race.race_class,
                        distance: race.distance,
                        courseName: meeting.name,
                        totalRunners: race.runners.length,
                        highestOR: race.highestOR,
                        time: race.time
                    },
                    meeting.going,
                    trainerData,
                    asOfDate,
                    categoryFilter,
                    jockeyData
                );

            // Preserve the complete checklist result separately.
            runner.checklist_rating =
                checklist.rating;

            runner.checklist_breakdown =
                checklist.breakdown;

            runner.checklist_points =
                `${checklist.earnedPoints}/${checklist.maxPoints}`;

            runner.checklist_earned_points =
                checklist.earnedPoints;

        }

        // ------------------------------------------------------------
        // PRIMARY RANKING
        //
        // V2 score is now the primary ranking.
        //
        // Ties:
        //   1. V2 score
        //   2. V2 confidence
        //   3. checklist earned points
        //
        // The checklist is therefore a fallback tie-breaker only.
        // It can no longer override a genuine V2 difference.
        // ------------------------------------------------------------

        race.runners.sort((a, b) => {

            const ratingDiff =
                (b.power_rating || 0) -
                (a.power_rating || 0);

            if (ratingDiff !== 0)
                return ratingDiff;

            const confidenceDiff =
                (b.confidence || 0) -
                (a.confidence || 0);

            if (confidenceDiff !== 0)
                return confidenceDiff;

            return (
                (b.checklist_earned_points || 0) -
                (a.checklist_earned_points || 0)
            );

        });

        // ------------------------------------------------------------
        // DRAW ADVANTAGE
        // ------------------------------------------------------------

        race.draw_advantage =
            checklistEngine.getRaceDrawPreference(
                meeting.name,
                race.distance
            );

    }

    return meeting;
}

module.exports = {
    analyseRace
};