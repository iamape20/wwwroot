'use strict';

/**
 * ============================================================================
 * TVG Racing Engine
 * Draw Engine
 * ----------------------------------------------------------------------------
 * Centralised draw bias calculations.
 * ============================================================================
 */

/**
 * Returns the configured draw bonus for a stall.
 *
 * drawBias example:
 * {
 *   low: [1,2,3],
 *   middle: [4,5,6],
 *   high: [7,8,9]
 * }
 */
function getDrawBonus(stall, drawBias = {}) {

    stall = Number(stall);

    if (!Number.isFinite(stall))
        return 0;

    if (Array.isArray(drawBias.low) && drawBias.low.includes(stall))
        return 1;

    if (Array.isArray(drawBias.middle) && drawBias.middle.includes(stall))
        return 0;

    if (Array.isArray(drawBias.high) && drawBias.high.includes(stall))
        return -1;

    return 0;

}

/**
 * Returns a text description.
 */
function classifyDraw(stall, drawBias = {}) {

    const bonus = getDrawBonus(stall, drawBias);

    if (bonus > 0)
        return 'ADVANTAGE';

    if (bonus < 0)
        return 'DISADVANTAGE';

    return 'NEUTRAL';

}

/**
 * Returns a percentage score.
 */
function drawScore(stall, drawBias = {}) {

    const bonus = getDrawBonus(stall, drawBias);

    switch (bonus) {

        case 1:
            return 100;

        case 0:
            return 75;

        case -1:
            return 40;

        default:
            return 50;

    }

}

module.exports = {

    getDrawBonus,

    classifyDraw,

    drawScore

};