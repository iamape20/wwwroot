'use strict';

const engine = require('./engine');

module.exports = function predictHorse(horse, context) {
    return engine(horse, context);
};