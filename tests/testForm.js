'use strict';

const assert = require('node:assert');

const history = require('../history');
const analyseForm = require('../analysis/form');

const horse = history.getHorse(1002553);

assert.ok(horse);

const result = analyseForm(horse);

console.log(result);

assert.strictEqual(typeof result.score, 'number');
assert.ok(Array.isArray(result.reasons));
assert.ok(Array.isArray(result.risks));

console.log('✓ Form module passed');