// ============================================================================
// File: backend/test-market.js
// Description: Test harness for Market Engine.
// ============================================================================

'use strict';

const marketEngine = require('./engine-v2/marketEngine');

const race = {

    betting_forecast: "Appier (2/1), Laravie (4/1), Mister Daydream (4/1), Knight Templar (11/2), Personal Best (6/1), Ludo's Landing (10/1)"

};

const result = marketEngine.analyse(

    {

        name: "APPIER"

    },

    race

);

console.log(result);