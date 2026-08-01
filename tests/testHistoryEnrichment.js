'use strict';

const assert = require('assert');
const { enrich } = require('../scraper/enrich/history');

// Sample runner based on Sporting Life structure
const runner = {
	past_results: [
		{
			date: '2026-07-01',
			or: 98,
			position: 1
		},
		{
			date: '2026-06-10',
			or: 95,
			position: 3
		},
		{
			date: '2026-05-18',
			or: 100,
			position: 2
		}
	]
};

enrich(runner);

console.dir(runner.past_results[0], { depth: null });

console.log(runner.history);

assert.ok(runner.history.lastRunDate);
assert.ok(typeof runner.history.daysSinceRun === 'number');
assert.strictEqual(runner.history.averageOR, 98);
assert.strictEqual(runner.history.highestOR, 100);
assert.strictEqual(runner.history.wins, 1);
assert.strictEqual(runner.history.places, 3);
assert.strictEqual(runner.history.averageFinish, 2);

console.log('History Enrichment OK');