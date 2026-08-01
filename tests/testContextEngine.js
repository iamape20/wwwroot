'use strict';

const assert = require('assert');
const contextEngine = require('../engine-v2/contextEngine');

const runner = {
    history: {
        averageOR: 98,
        wins: 1,
        places: 3,
        averageFinish: 2,
        daysSinceRun: 23
    }
};

const result = contextEngine.analyse(runner);

console.log(result);

assert.ok(result.score > 0);
assert.strictEqual(result.confidence, 'Medium');

console.log('Context Engine OK');