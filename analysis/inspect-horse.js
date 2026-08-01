'use strict';

const fs = require('fs');
const path = require('path');

const horseId = '1002553';

const file = path.join(
    __dirname,
    '..',
    '..',
    'json',
    'horses',
    `${horseId}.json`
);

if (!fs.existsSync(file)) {
    console.error(`Horse file not found: ${file}`);
    process.exit(1);
}

const horse = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('======================================');
console.log('Horse ID :', horseId);
console.log('======================================\n');

console.log('Top-level fields');
console.log('----------------');

Object.keys(horse).forEach(key => {
    console.log('-', key);
});

console.log('\n======================================');
console.log('Full record');
console.log('======================================\n');

console.dir(horse, {
    depth: 5,
    colors: true
});