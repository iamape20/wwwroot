'use strict';

const history = require('../history');
const predictHorse = require('./engine');
const buildExplanation = require('./explanation');

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

console.log(buildExplanation(prediction));