'use strict';

const assert = require('node:assert');
const history = require('../history');

const horse = history.getHorse(1002553);

assert.ok(horse);
assert.strictEqual(horse.id, '1002553');

console.log('✓ Horse loaded');
console.log(horse.name);

const trainer = history.getTrainer(35498);

if (trainer)
    console.log('✓ Trainer loaded');

const jockey = history.getJockey(2202);

if (jockey)
    console.log('✓ Jockey loaded');