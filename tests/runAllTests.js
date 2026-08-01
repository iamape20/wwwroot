'use strict';

const tests = [
    './testFormEnrichment',
    './testFormEngine',
    './testHistoryEnrichment',
    './testContextEngine',
    './testWeights'
];

console.log('======================================');
console.log('Horse Predictor Unit Test Suite');
console.log('======================================\n');

for (const test of tests) {
    console.log(`Running ${test}...`);

    try {
        require(test);
        console.log('PASS\n');
    } catch (err) {
        console.error(`FAIL: ${err.message}\n`);
        process.exit(1);
    }
}

console.log('======================================');
console.log('All unit tests passed.');
console.log('======================================');