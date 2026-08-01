// ============================================================================
// File: backend/tests/testFormEnrichment.js
// Description: Tests the form enrichment module.
// Author: TVG TechBar / ChatGPT
// Version: 1.0.0
// ============================================================================

'use strict';

const { enrichForm } = require('../scraper/enrich/form');

const runner = {
    formsummary: '13P2F1/U'
};
enrichForm(runner);

console.log(JSON.stringify(runner.form, null, 4));

// ============================================================================
// End of File
// ============================================================================