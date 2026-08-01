'use strict';

const history = require('./history');

const race = history.getRace(2026072701);

if (!race) {
    console.log('Race not found.');
    process.exit(1);
}

console.log(race);