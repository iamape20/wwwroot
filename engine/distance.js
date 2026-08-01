'use strict';

/**
 * ============================================================================
 * TVG Racing Engine
 * Distance Engine
 * ----------------------------------------------------------------------------
 * Shared distance helper functions.
 *
 * This module replaces all distance-related helper functions in a1ratings.js.
 * ============================================================================
 */

const { CONFIG } = require('./constants');

/**
 * Convert furlongs to yards.
 */
function furlongsToYards(furlongs) {

    const value = Number(furlongs);

    return Number.isFinite(value)
        ? value * 220
        : 0;

}

/**
 * Convert yards to furlongs.
 */
function yardsToFurlongs(yards) {

    const value = Number(yards);

    return Number.isFinite(value)
        ? value / 220
        : 0;

}

/**
 * Difference between two race distances.
 */
function distanceDifference(distance1, distance2) {

    return Math.abs(
        Number(distance1 || 0) -
        Number(distance2 || 0)
    );

}

/**
 * Returns true if today's distance is effectively
 * the same as a historical run.
 */
function isDistanceMatch(distance1, distance2) {

    return distanceDifference(
        distance1,
        distance2
    ) <= CONFIG.DISTANCE_TOLERANCE_YARDS;

}

/**
 * Returns a percentage similarity.
 *
 * 100 = identical
 * 0   = completely different
 */
function similarity(distance1, distance2) {

    const diff = distanceDifference(distance1, distance2);

    const max = CONFIG.DISTANCE_TOLERANCE_YARDS * 4;

    const score = Math.max(
        0,
        100 - ((diff / max) * 100)
    );

    return Math.round(score);

}

/**
 * Average winning trip.
 */
function preferredDistance(summary) {

    if (
        !summary ||
        !summary.winningDistances ||
        !summary.winningDistances.length
    )
        return null;

    const total =
        summary.winningDistances.reduce(
            (a, b) => a + b,
            0
        );

    return total / summary.winningDistances.length;

}

/**
 * Suitability percentage for today's trip.
 */
function suitability(summary, todayDistance) {

    const preferred = preferredDistance(summary);

    if (preferred === null)
        return 50;

    return similarity(
        preferred,
        todayDistance
    );

}

module.exports = {

    furlongsToYards,

    yardsToFurlongs,

    distanceDifference,

    isDistanceMatch,

    similarity,

    preferredDistance,

    suitability

};