
// ============================================================================
// File: backend/engine-v2/scoreEngine.js
// Description: Combines engine scores into a composite score.
// Author: TVG TechBar / ChatGPT
// Version: 2.0.0
// ============================================================================

'use strict';

const config = require('./config');

const DEFAULT_WEIGHTS = config.weights;

function calculate(scores) {

    let composite = 0;
    const breakdown = {};

    for (const [engine, result] of Object.entries(scores)) {

        const score = result?.score ?? 0;
        const weight = DEFAULT_WEIGHTS[engine] ?? 0;

        breakdown[engine] = {
            score,
            weight,
            weighted: Number((score * weight).toFixed(2))
        };

        composite += score * weight;
    }

    return {

        score: Number(composite.toFixed(1)),

        breakdown

    };

}

module.exports = {

    calculate

};

// End of File