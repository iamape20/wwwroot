'use strict';

/**
 * ============================================================================
 * TVG Racing Engine
 * Weight Engine
 * ----------------------------------------------------------------------------
 * Handles all horse weight conversions and comparisons.
 * ============================================================================
 */

const { CONFIG } = require('./constants');

/**
 * Parse racing weight.
 *
 * Accepts:
 * 9-7
 * 10-02
 * 11-0
 * 9 7
 * 133
 */
function parseToPounds(weight) {

    if (weight === null || weight === undefined)
        return 0;

    if (typeof weight === 'number')
        return weight;

    const text = String(weight).trim();

    if (/^\d+$/.test(text))
        return Number(text);

    const match = text.match(/(\d+)[-\s](\d+)/);

    if (!match)
        return 0;

    const stones = Number(match[1]);
    const pounds = Number(match[2]);

    return (stones * 14) + pounds;

}

/**
 * Convert pounds back to racing format.
 */
function poundsToString(lbs) {

    lbs = Number(lbs);

    if (!Number.isFinite(lbs))
        return '';

    const stones = Math.floor(lbs / 14);
    const pounds = lbs % 14;

    return `${stones}-${pounds}`;

}

/**
 * Compare today's weight with average winning weight.
 */
function weightDifference(todayWeight, averageWinningWeight) {

    return Number(todayWeight || 0) -
           Number(averageWinningWeight || 0);

}

/**
 * Simple weight penalty.
 *
 * Returns a negative adjustment.
 */
function weightPenalty(todayWeight, averageWinningWeight) {

    if (averageWinningWeight == null)
        return 0;

    const diff = weightDifference(
        todayWeight,
        averageWinningWeight
    );

    if (diff <= 0)
        return 0;

    if (diff >= 14)
        return -4;

    if (diff >= 10)
        return -3;

    if (diff >= 7)
        return -2;

    if (diff >= 4)
        return -1;

    return 0;

}

/**
 * Is today's weight considered high?
 */
function isHighWeight(weight) {

    return Number(weight) >= CONFIG.HEAVY_WEIGHT_LBS;

}

module.exports = {

    parseToPounds,

    poundsToString,

    weightDifference,

    weightPenalty,

    isHighWeight

};