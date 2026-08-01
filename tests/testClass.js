'use strict';

const history = require('../history');
const analyseClass = require('../analysis/class');

const horse = history.getHorse(1002553);

console.log(
    analyseClass(horse, '5')
);

console.log('✓ Class module passed');