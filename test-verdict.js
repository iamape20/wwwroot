'use strict';

const verdictEngine = require('./engine-v2/verdictEngine');

const race = {

    verdict: "Appier is taken to follow up from his recent success and should prove difficult to beat. Laravie is feared most."

};

const result = verdictEngine.analyse(

    {
        name: 'APPIER'
    },

    race

);

console.log(result);