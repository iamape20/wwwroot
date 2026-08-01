'use strict';

const { getRace } = require('../history/races');
const predictRace = require('./racePredictor');

const race = getRace(2026072701);

if (!race) {

    console.log('Race not found');
    process.exit(1);

}

const predictions = predictRace(
    race.runners,
    race
);

console.table(
    predictions.map(p => ({
        Rank: p.rank,
        Horse: p.horse,
        Rating: p.rating,
        Confidence: p.confidence
    }))
);