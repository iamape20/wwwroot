// ============================================================================
// File: backend/engine-v2/config.js
// Description: Global configuration for Race Predictor V2
// Author: TVG TechBar / ChatGPT
// Version: 2.1.0
// ============================================================================

'use strict';

module.exports = {
	weights: {
		form: 0.40,
		context: 0.30,
		market: 0.20,
		verdict: 0.10
	},
    scoring: {
        maxScore: 100,
        minScore: 0
    },
    marketScores: {
        1: 100,
        2: 92,
        3: 86,
        4: 80,
        5: 74,
        6: 68,
        7: 62,
        8: 56,
        9: 50,
        10: 45
    }
};

// End of File