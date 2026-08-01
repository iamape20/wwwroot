'use strict';

const assert = require('node:assert');

const history = require('../history');
const predictHorse = require('../prediction/engine');
const horse = history.getHorse(1002553);

const race = {
    course: 'Catterick',
    distance: '5f',
    going: 'Good',
    raceClass: '5',
    runners: 11,
    handicap: true,
    surface: 'Turf',
    type: 'Handicap'
};

const prediction = predictHorse(horse, race);

const expectedModules = [
    'form',
    'going',
    'distance',
    'class',
    'ratings',
    'course',
    'market',
    'consistency',
	'trainer',
	'raceContext'
];


for (const name of expectedModules) {

    assert.ok(
        prediction.analyses[name],
        `Missing module: ${name}`
    );

}

for (const [name, result] of Object.entries(prediction.analyses)) {

    assert.ok(
        Array.isArray(result.reasons),
        `${name}.reasons is not an array`
    );

    assert.ok(
        Array.isArray(result.risks),
        `${name}.risks is not an array`
    );

    if (result.score < 0 || result.score > 10) {
        throw new Error(
            `${name} score out of range (${result.score})`
        );
    }

}

if (prediction.rating < 0 || prediction.rating > 10) {
    throw new Error(
        `Overall rating out of range (${prediction.rating})`
    );
}

console.dir(prediction, { depth: 5 });

console.log('✓ Prediction engine passed');