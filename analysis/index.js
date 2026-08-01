'use strict';

const modules = require('./modules');

module.exports = function analyseHorse(horse, context) {

    const analyses = {};

    for (const module of modules) {

        analyses[module.name] = module.analyse(
            horse,
            context.race || context
        );

    }

    return analyses;
};