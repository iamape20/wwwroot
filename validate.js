'use strict';

const path = require('path');

const checks = [];

function runCheck(name, fn) {
    try {
        fn();
        checks.push({
            name,
            status: 'PASS'
        });
    }
    catch (err) {
        checks.push({
            name,
            status: 'FAIL',
            error: err.message
        });
    }
}

console.log('');
console.log('==============================================');
console.log(' Elite Power Ratings Validator v2.0');
console.log('==============================================');
console.log('');

//
// Configuration
//

console.log('Configuration');
console.log('----------------------------------------------');

runCheck('weights.json', () => {
    require('./config/weights.json');
});

runCheck('pace.json', () => {
    require('./config/pace.json');
});

//
// Engine
//

console.log('');
console.log('Prediction Engine');
console.log('----------------------------------------------');

runCheck('engine.js', () => {
    require('./prediction/engine');
});

runCheck('predictRace.js', () => {
    require('./prediction/predictRace');
});

runCheck('paceCalculator.js', () => {
    require('./prediction/paceCalculator');
});

runCheck('paceImpact.js', () => {
    require('./prediction/paceImpact');
});

runCheck('confidence.js', () => {
    require('./prediction/confidence');
});

//
// Analysis
//

console.log('');
console.log('Analysis Modules');
console.log('----------------------------------------------');

runCheck('analysis/index.js', () => {
    require('./analysis');
});

runCheck('analysis/modules.js', () => {
    require('./analysis/modules');
});

//
// Load race
//

console.log('');
console.log('Race');
console.log('----------------------------------------------');

const races = require(
    path.join(__dirname, '..', 'json', 'final_ratings.json')
);

if (!Array.isArray(races) || races.length === 0) {
    console.error('No races found in json/final_ratings.json');
    process.exit(1);
}

const race = races[0];

console.log(`${race.course} ${race.raceTime}`);
console.log(`${race.runners.length} runners`);
console.log('');

runCheck('Race loaded', () => {

    if (!race.course)
        throw new Error('Course missing');

    if (!race.raceTime)
        throw new Error('Race time missing');

    if (!Array.isArray(race.runners))
        throw new Error('Runner array missing');

    if (race.runners.length === 0)
        throw new Error('No runners');

});

//
// Prediction
//

console.log('Prediction');
console.log('----------------------------------------------');

const predictRace = require('./prediction/predictRace');

let result = null;

runCheck('Race Prediction', () => {

    try {

        result = predictRace(race);

    }
    catch (err) {

        console.error(err.stack);

        throw err;

    }

});

runCheck('Race returned', () => {

    if (!result)
        throw new Error('No result returned');

});

runCheck('Predictions returned', () => {

    if (!Array.isArray(result.predictions))
        throw new Error('Predictions missing');

});

runCheck('Prediction count', () => {

    if (result.predictions.length !== race.runners.length)
        throw new Error(
            `Expected ${race.runners.length}, got ${result.predictions.length}`
        );

});

runCheck('Confidence exists', () => {

    for (const prediction of result.predictions) {

        if (prediction.confidence === undefined) {

            throw new Error(
                `${prediction.horse} missing confidence`
            );

        }

    }

});

runCheck('Running Styles', () => {

    for (const prediction of result.predictions) {

        if (!prediction.analyses)
            throw new Error(`${prediction.horse} missing analyses`);

        if (!prediction.analyses.runningStyle)
            throw new Error(
                `${prediction.horse} missing runningStyle`
            );

    }

});

runCheck('Race Pace', () => {

    if (!result.race)
        throw new Error('Race object missing');

    if (!result.race.pace)
        throw new Error('Race pace missing');

    if (!result.race.pace.expectedPace)
        throw new Error('Expected pace missing');

});

runCheck('Sorted', () => {

    for (let i = 1; i < result.predictions.length; i++) {

        if (
            result.predictions[i].rating >
            result.predictions[i - 1].rating
        ) {

            throw new Error(
                `${result.predictions[i].horse} is out of order`
            );

        }

    }

});

//
// Report
//

console.log('');
console.log('Results');
console.log('----------------------------------------------');

let passed = 0;
let failed = 0;

for (const check of checks) {

    if (check.status === 'PASS') {

        passed++;
        console.log(`✓ ${check.name}`);

    }
    else {

        failed++;
        console.log(`✗ ${check.name}`);
        console.log(`    ${check.error}`);

    }

}

console.log('----------------------------------------------');
console.log(`Passed : ${passed}`);
console.log(`Failed : ${failed}`);

console.log('');

if (failed === 0) {

    console.log('VALIDATION PASSED');

}
else {

    console.log('VALIDATION FAILED');
    process.exitCode = 1;

}

console.log('');