'use strict';

const assert = require('node:assert');
const analyseForm = require('./form');

const runner = {
    id: 123,
    name: "Poet's Dawn"
};

const history = {
    runs: [
        { position: 1 },
        { position: 3 },
        { position: 2 },
        { position: 5 },
        { position: 1 }
    ]
};

const result = analyseForm(runner, history);

assert.strictEqual(result.score, 25);
assert.deepStrictEqual(result.reasons, ['Excellent recent form']);
assert.deepStrictEqual(result.risks, []);

console.log('✓ Form analysis test passed');