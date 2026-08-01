'use strict';

const formEngine = require('./engine-v2/formEngine');
const marketEngine = require('./engine-v2/marketEngine');
const verdictEngine = require('./engine-v2/verdictEngine');
const scoreEngine = require('./engine-v2/scoreEngine');

const runner = {

    name: 'APPIER',
    formsummary: '111338'

};

const race = {

    betting_forecast:
        'Appier (2/1), Laravie (4/1), Mister Daydream (4/1)',

    verdict:
        'Appier is taken to follow up from his recent success and should prove difficult to beat.'

};

const scores = {

    form: formEngine.analyse(runner, race),
    market: marketEngine.analyse(runner, race),
    verdict: verdictEngine.analyse(runner, race)

};

console.log(scores);

console.log();

console.log(scoreEngine.calculate(scores));