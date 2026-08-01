'use strict';

const history = require('../history');
const predictRace = require('./racePredictor');

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

//
// Example runner IDs
// Replace these with real IDs from your history database.
//

const runnerIds = [
    1002553
];

const runners = runnerIds
    .map(id => history.getHorse(id))
    .filter(Boolean);

const predictions = predictRace(runners, race);

console.table(
    predictions.map(p => ({
        Rank: p.rank,
        Horse: p.horse,
        Rating: p.rating,
        Confidence: p.confidence
    }))
);