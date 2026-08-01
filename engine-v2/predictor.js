// ============================================================================
// File: backend/engine-v2/predictor.js
// Description: Race Predictor V2 Orchestrator
// Author: TVG TechBar / ChatGPT
// Version: 2.1.0
// ============================================================================

'use strict';

const formEngine = require('./formEngine');
const marketEngine = require('./marketEngine');
const verdictEngine = require('./verdictEngine');
const contextEngine = require('./contextEngine');
const scoreEngine = require('./scoreEngine');
const horseProfileEngine = require('../horseProfileEngine');
const confidenceEngine = require('../confidenceEngine');

function predictRace(race) {

    const results = [];

    for (const runner of race.runners) {

		// Populate running-style profile from past_results before
		// anything downstream (confidenceEngine) needs it.
		runner.horse_profile = horseProfileEngine.build(runner);

		const engines = {

			form: formEngine.analyse(runner, race),

			context: contextEngine.analyse(runner, race),

			market: marketEngine.analyse(runner, race),

			verdict: verdictEngine.analyse(runner, race)

		};

        const composite = scoreEngine.calculate(engines);

        const confidence = confidenceEngine.calculateConfidence(runner, race);

        results.push({

            runner,

            engines,

            score: composite.score,

            breakdown: composite.breakdown,

            confidence

        });

    }

    results.sort((a, b) => b.score - a.score);

    return {

        winner: results[0],

        runners: results

    };

}

module.exports = {

    predictRace

};

// End of File