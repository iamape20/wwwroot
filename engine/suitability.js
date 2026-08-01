'use strict';

/**
 * ============================================================================
 * TVG Racing Engine
 * Suitability Engine
 * ----------------------------------------------------------------------------
 * Combines the various condition scores into one suitability percentage.
 * ============================================================================
 */

function calculateSuitability({

    course = 50,
    distance = 50,
    going = 50,
    classScore = 50,
    draw = 50,
    fitness = 50

} = {}) {

    const values = [

        course,
        distance,
        going,
        classScore,
        draw,
        fitness

    ].filter(Number.isFinite);

    if (!values.length)
        return 50;

    const total =
        values.reduce((a, b) => a + b, 0);

    return Math.round(total / values.length);

}

module.exports = {

    calculateSuitability

};