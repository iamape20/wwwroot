// ============================================================================
// File: backend/tests/testFormEngine.js
// Description: Tests the Form Engine.
// Author: TVG TechBar / ChatGPT
// Version: 1.0.0
// ============================================================================

'use strict';

const { enrichForm } = require('../scraper/enrich/form');
const formEngine = require('../engine-v2/formEngine');

const runner = {
    name: 'Test Horse',
    formsummary: '13P2F1/U'
};

enrichForm(runner);

const result = formEngine.analyse(runner);

console.log(JSON.stringify(result, null, 4));

// ============================================================================
// End of File
// ============================================================================