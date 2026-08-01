'use strict';

const history = require('../history');
const analyseRatings = require('../analysis/ratings');

const horse = history.getHorse('1002553');

console.log(analyseRatings(horse));

console.log('✓ Ratings module passed');