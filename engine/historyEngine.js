'use strict';

/**
 * ============================================================================
 * TVG Racing Engine
 * History Engine
 * ----------------------------------------------------------------------------
 * Builds a reusable summary of a horse's previous runs.
 *
 * This replaces repeated history.filter(), history.find(),
 * history.some() and history.reduce() calls throughout the engine.
 *
 * Version 1.0
 * ============================================================================
 */

const { CONFIG } = require('./constants');

/**
 * Safely convert a value to a number.
 */
function number(value, fallback = 0) {

    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;

}

/**
 * Build summary from historical runs.
 *
 * @param {Array} history
 * @returns {Object}
 */
function buildHistorySummary(history = []) {

    const summary = {

        runs: 0,

        wins: 0,

        places: 0,

        courseWins: new Map(),

        courseRuns: new Map(),

        goingWins: new Map(),

        goingRuns: new Map(),

        classWins: new Map(),

        classRuns: new Map(),

        distances: [],

        winningDistances: [],

        speed: {

            best: 0,

            average: 0

        },

        weight: {

            averageWinning: null

        },

        lastRun: null,

        lastRunDays: null

    };

    let speedTotal = 0;

    let winningWeights = [];

    for (const run of history) {

        if (!run)
            continue;

        summary.runs++;

        const position = number(run.position || run.finish || run.pos, 99);

        const course =
            run.course ||
            run.course_name ||
            run.track ||
            "";

        const going =
            run.going ||
            run.going_description ||
            "";

        const raceClass =
            run.class ||
            run.raceClass ||
            "";

        const distance =
            number(
                run.distanceYards ??
                run.distance_yards ??
                run.distance
            );

        const speed =
            number(
                run.speed ??
                run.speedRating ??
                run.speed_rating
            );

        const weight =
            number(
                run.weightLbs ??
                run.weight_lbs ??
                run.weight
            );

        if (position === 1)
            summary.wins++;

        if (position <= 3)
            summary.places++;

        // -------------------------------------------------------------
        // Course
        // -------------------------------------------------------------

        if (course) {

            summary.courseRuns.set(
                course,
                (summary.courseRuns.get(course) || 0) + 1
            );

            if (position === 1) {

                summary.courseWins.set(
                    course,
                    (summary.courseWins.get(course) || 0) + 1
                );

            }

        }

        // -------------------------------------------------------------
        // Going
        // -------------------------------------------------------------

        if (going) {

            summary.goingRuns.set(
                going,
                (summary.goingRuns.get(going) || 0) + 1
            );

            if (position === 1) {

                summary.goingWins.set(
                    going,
                    (summary.goingWins.get(going) || 0) + 1
                );

            }

        }

        // -------------------------------------------------------------
        // Class
        // -------------------------------------------------------------

        if (raceClass) {

            summary.classRuns.set(
                raceClass,
                (summary.classRuns.get(raceClass) || 0) + 1
            );

            if (position === 1) {

                summary.classWins.set(
                    raceClass,
                    (summary.classWins.get(raceClass) || 0) + 1
                );

            }

        }

        // -------------------------------------------------------------
        // Distance
        // -------------------------------------------------------------

        if (distance > 0) {

            summary.distances.push(distance);

            if (position === 1)
                summary.winningDistances.push(distance);

        }

        // -------------------------------------------------------------
        // Speed
        // -------------------------------------------------------------

        if (speed > 0) {

            speedTotal += speed;

            if (speed > summary.speed.best)
                summary.speed.best = speed;

        }

        // -------------------------------------------------------------
        // Weight
        // -------------------------------------------------------------

        if (position === 1 && weight > 0)
            winningWeights.push(weight);

        // -------------------------------------------------------------
        // Last run
        // -------------------------------------------------------------

        const date =
            run.date ||
            run.raceDate ||
            run.racedate;

        if (date) {

            const d = new Date(date);

            if (!isNaN(d)) {

                if (!summary.lastRun || d > summary.lastRun)
                    summary.lastRun = d;

            }

        }

    }

    // -----------------------------------------------------------------
    // Final calculations
    // -----------------------------------------------------------------

    if (summary.runs > 0)
        summary.speed.average = speedTotal / summary.runs;

    if (winningWeights.length > 0) {

        summary.weight.averageWinning =
            winningWeights.reduce((a, b) => a + b, 0) /
            winningWeights.length;

    }

    if (summary.lastRun) {

        const today = new Date();

        summary.lastRunDays = Math.floor(
            (today - summary.lastRun) /
            (1000 * 60 * 60 * 24)
        );

    }

    return summary;

}

/**
 * True if horse is considered race fit.
 */
function isRaceFit(summary) {

    if (summary.lastRunDays === null)
        return false;

    return summary.lastRunDays <= CONFIG.FITNESS_DAYS_FLAT;

}

/**
 * Average winning distance.
 */
function preferredDistance(summary) {

    if (!summary.winningDistances.length)
        return null;

    return (
        summary.winningDistances.reduce((a, b) => a + b, 0) /
        summary.winningDistances.length
    );

}

/**
 * Win strike rate.
 */
function strikeRate(summary) {

    if (!summary.runs)
        return 0;

    return (summary.wins / summary.runs) * 100;

}

module.exports = {

    buildHistorySummary,

    isRaceFit,

    preferredDistance,

    strikeRate

};