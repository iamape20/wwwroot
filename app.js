'use strict';

const fs = require('fs');
const config = require('./config');
const pipeline = require('./pipeline');
const logger = require('./logger');
const stats = require('./stats');
const start = Date.now();

console.log('');
console.log('=========================================================');
logger.info('Horse Prediction Engine');
console.log('=========================================================');
console.log('');


const meetings = JSON.parse(
    fs.readFileSync(config.paths.cards, 'utf8')
);

const results = pipeline(meetings);

fs.writeFileSync(
    config.paths.output,
    JSON.stringify(results, null, 2),
    'utf8'
);

const elapsed = ((Date.now() - start) / 1000).toFixed(2);

console.log('');

console.log('======================================');
console.log('Prediction Engine Complete');
console.log('======================================');

console.table(stats);

console.log(`Elapsed : ${elapsed}s`);
console.log(`Output  : ${config.paths.output}`);

console.log('=========================================================');