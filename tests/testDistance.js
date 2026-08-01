'use strict';

const assert = require('node:assert');

const history = require('../history');
const analyseDistance = require('../analysis/distance');

const horse = history.getHorse(1002553);

assert.ok(horse);

// Replace with today's race distance if different
const result = analyseDistance(horse, '5f');

console.log(result);

assert.strictEqual(typeof result.score, 'number');

console.log('✓ Distance module passed');