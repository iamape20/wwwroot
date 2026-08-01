// ============================================================================
// File: backend/tests/regressionSuite.js
// Description: Regression test suite for the Horse Prediction Engine.
// Author: TVG TechBar / ChatGPT
// Version: 1.0.0
// ============================================================================

'use strict';

const cards = require('../data/stage2_cards.json');
const predictor = require('../engine-v2/predictor');

let passed = 0;
let failed = 0;

console.log('==========================================================');
console.log('Horse Predictor Regression Suite');
console.log('==========================================================\n');

for (const meeting of Object.values(cards)) {

    for (const race of meeting.races) {

        try {

            const result = predictor.predictRace(race);

            if (
                result &&
                result.winner &&
                result.runners &&
                result.runners.length > 0
            ) {

                passed++;

            } else {

                failed++;

                console.log(`FAIL ${race.time}`);

            }

        } catch (err) {

            failed++;

            console.log(`FAIL ${race.time}`);
            console.log(err.message);

        }

    }

}

console.log('\n==========================================================');
console.log(`PASS : ${passed}`);
console.log(`FAIL : ${failed}`);
console.log('==========================================================');

process.exit(failed ? 1 : 0);

// ============================================================================
// End of File
// ============================================================================