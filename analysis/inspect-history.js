'use strict';

const history = require('../../json/stage3_horses.json');

const horseIds = Object.keys(history);

console.log('---------------------------------------');
console.log(`Horse records : ${horseIds.length}`);
console.log('---------------------------------------');

if (horseIds.length === 0) {
    console.log('No horse data found.');
    process.exit(0);
}

const firstId = horseIds[0];
const horse = history[firstId];

console.log('Horse ID :', firstId);
console.log('Horse Name :', horse.name);
console.log('');

console.log('Available fields');
console.log('----------------');

for (const key of Object.keys(horse)) {
    console.log('-', key);
}

console.log('');
console.log('Sample record');
console.log('----------------');

console.dir(horse, { depth: 3, colors: true });

const ids = Object.keys(history);

for (let i = 0; i < Math.min(10, ids.length); i++) {
    const id = ids[i];

    console.log('--------------------------------');
    console.log('ID:', id);
    console.dir(history[id], { depth: 2, colors: true });
}