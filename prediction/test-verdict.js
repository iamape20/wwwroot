'use strict';

const verdict = require('./verdict');

[95, 84, 76, 64, 53, 41].forEach(score => {

    console.log(score, '=>', verdict(score));

});