
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


// ============================================================================
// HISTORICAL SNAPSHOT
// ============================================================================
//
// IMPORTANT:
//
// Every downstream calculation must work from information available BEFORE
// the race being analysed.
//
// Results are:
//   1. validated
//   2. filtered to <= race date
//   3. sorted newest -> oldest
//
// This prevents future results from contaminating historical calculations.
// ============================================================================

// Mirrors checklistEngine.js's own currentOfficialRating - most recent
// run's OR is the horse's current, up-to-date ability rating.
function currentOfficialRating(pastResults) {
    const withOR = (pastResults || []).find(r => typeof r.official_rating === "number");
    return withOR ? withOR.official_rating : null;
}

function getHistoricalRuns(pastResults, asOfDate) {

    if (!Array.isArray(pastResults)) {
        return [];
    }

    return pastResults
        .filter(r => {

            if (!r?.date) {
                return false;
            }

            const d = new Date(r.date);

            return (
                !isNaN(d.getTime()) &&
                d <= asOfDate
            );

        })
        .sort((a, b) => {

            const da = new Date(a.date);
            const db = new Date(b.date);

            return db - da;

        });

}


// ============================================================================
// LOAD JSON
// ============================================================================

function loadJsonFile(dir, id) {

    if (!id) {
        return null;
    }

    const file = path.join(dir, `${id}.json`);

    if (!fs.existsSync(file)) {
        return null;
    }

    try {

        return JSON.parse(
            fs.readFileSync(file, "utf8")
        );

    } catch {

        return null;

    }

}


// ============================================================================
// DAYS SINCE RUN
// ============================================================================

function computeDaysSinceRun(dateStr, asOfDate) {

    if (!dateStr) {
        return null;
    }

    const then = new Date(dateStr);

    if (isNaN(then.getTime())) {
        return null;
    }

    return Math.round(
        (asOfDate - then) / 86400000
    );

}


// ============================================================================
// BUILD HISTORY
// ============================================================================
//
// IMPORTANT:
//
// This function receives ONLY the already-filtered historical snapshot.
// It therefore cannot accidentally use future results.
// ============================================================================

function buildHistory(pastResults, daysSinceRun) {

    if (!pastResults || !pastResults.length) {
        return null;
    }

    const positions = pastResults
        .map(r => r.pos)
        .filter(
            p =>
                typeof p === "number" &&
                p > 0
        );

    const ratings = pastResults
        .map(r => r.official_rating)
        .filter(
            v =>
                typeof v === "number"
        );

    const wins =
        positions.filter(
            p => p === 1
        ).length;

    const places =
        positions.filter(
            p =>
                p === 2 ||
                p === 3
        ).length;

    return {

        averageOR:
            ratings.length
                ? Math.round(
                    ratings.reduce(
                        (a, b) => a + b,
                        0
                    ) / ratings.length
                )
                : null,

        wins,

        places,

        averageFinish:
            positions.length
                ? Number(
                    (
                        positions.reduce(
                            (a, b) => a + b,
                            0
                        ) /
                        positions.length
                    ).toFixed(1)
                )
                : null,

        daysSinceRun

    };

}


// ============================================================================
// RACE ANALYSIS
// ============================================================================

async function analyseRace(
    meeting,
    dataDirs = {},
    categoryFilter = null
) {

    const horseDir =
        dataDirs.horseDir ||
        DEFAULT_HORSE_DIR;

    const trainerDir =
        dataDirs.trainerDir ||
        DEFAULT_TRAINER_DIR;

    const jockeyDir =
        dataDirs.jockeyDir ||
        DEFAULT_JOCKEY_DIR;


    // ------------------------------------------------------------------------
    // ANCHOR EVERYTHING TO THE RACE DATE
    // ------------------------------------------------------------------------

    const asOfDate =
        new Date(meeting.date);


    if (isNaN(asOfDate.getTime())) {

        throw new Error(
            `Invalid meeting date: ${meeting.date}`
        );

    }


    for (const race of meeting.races) {


        // ====================================================================
        // LOAD HORSE DATA
        // ====================================================================

        for (const runner of race.runners) {

            const horseData =
                loadJsonFile(
                    horseDir,
                    runner.id
                );


            const allPastResults =
                horseData?.past_results || [];


            // ----------------------------------------------------------------
            // CREATE THE AUTHORITATIVE HISTORICAL SNAPSHOT
            // ----------------------------------------------------------------

            const historicalRuns =
                getHistoricalRuns(
                    allPastResults,
                    asOfDate
                );


            // ----------------------------------------------------------------
            // Store ONLY the historical snapshot downstream engines should use
            // ----------------------------------------------------------------

            runner.past_results =
                historicalRuns;


            runner.historical_runs =
                historicalRuns.length;


            runner.is_unexposed =
                historicalRuns.length < 3;


            // ----------------------------------------------------------------
            // Most recent run BEFORE this race
            // ----------------------------------------------------------------

            const lastRunBeforeRace =
                historicalRuns[0];


            if (lastRunBeforeRace) {

                runner.days_since_run =
                    computeDaysSinceRun(
                        lastRunBeforeRace.date,
                        asOfDate
                    );

                runner.last_run_date_used =
                    lastRunBeforeRace.date;

            } else {

                runner.days_since_run = null;
                runner.last_run_date_used = null;

            }


            // ----------------------------------------------------------------
            // Historical summary
            // ----------------------------------------------------------------

            runner.history =
                buildHistory(
                    historicalRuns,
                    runner.days_since_run
                );


            // ----------------------------------------------------------------
            // Form profile
            //
            // It now receives the filtered historical snapshot.
            // ----------------------------------------------------------------

            runner.form =
                formProfileEngine.build(
                    runner
                );

        }


        // ====================================================================
        // FIELD OR
        // ====================================================================

        const fieldORs =
            race.runners
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
                .filter(
                    v => v != null
                );


        race.highestOR =
            fieldORs.length
                ? Math.max(...fieldORs)
                : null;


        // ====================================================================
        // V2 PREDICTION
        // ====================================================================

        const prediction =
            predictor.predictRace(
                race
            );


        // ====================================================================
        // APPLY BOTH MODELS
        // ====================================================================

        for (const result of prediction.runners) {

            const runner =
                result.runner;


            // ================================================================
            // V2 MODEL
            // ================================================================

            runner.v2_score =
                result.score;

            runner.power_rating =
                result.score;

            runner.confidence =
                result.confidence.score;

            runner.confidence_grade =
                result.confidence.grade;

            runner.rating_breakdown =
                result.breakdown;

            runner.engine_details =
                result.engines;


            // ================================================================
            // CHECKLIST MODEL
            // ================================================================

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


            runner.checklist_rating =
                checklist.rating;

            runner.checklist_breakdown =
                checklist.breakdown;

            runner.checklist_points =
                `${checklist.earnedPoints}/${checklist.maxPoints}`;

            runner.checklist_earned_points =
                checklist.earnedPoints;

        }


        // ====================================================================
        // PRIMARY RANKING
        // ====================================================================

		race.runners.sort(
			(a, b) => {

				const ratingDiff =
					(b.power_rating || 0) -
					(a.power_rating || 0);


				if (ratingDiff !== 0) {
					return ratingDiff;
				}


				const confidenceDiff =
					(b.confidence || 0) -
					(a.confidence || 0);


				if (confidenceDiff !== 0) {
					return confidenceDiff;
				}


				const checklistDiff =
					(b.checklist_earned_points || 0) -
					(a.checklist_earned_points || 0);

				if (checklistDiff !== 0) {
					return checklistDiff;
				}

				// 2026-09-01: explicit OR tie-break, closing the gap
				// leaveOneOutAll.js flagged (1.9% of top picks were tied and
				// decided by array order rather than a real rule). Mirrors
				// predictor.js's own OR tie-break convention.
				const orA = currentOfficialRating(a.past_results);
				const orB = currentOfficialRating(b.past_results);

				if (orA !== null && orB !== null && orB !== orA) {
					return orB - orA;
				}

				return 0;

			}
		);

        // ====================================================================
        // DRAW ADVANTAGE
        // ====================================================================

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
