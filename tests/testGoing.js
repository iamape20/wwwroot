'use strict';

const assert = require('node:assert');

const history = require('../history');
const analyseGoing = require('../analysis/going');

const horse = history.getHorse(1002553);

assert.ok(horse);

const result = analyseGoing(horse);

console.log(result);

assert.strictEqual(typeof result.score, 'number');

console.log('✓ Going module passed');