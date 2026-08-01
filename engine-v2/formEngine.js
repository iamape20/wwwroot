// ============================================================================
// File: backend/engine-v2/formEngine.js
// Description: Scores a runner using enriched form data.
// Author: TVG TechBar / ChatGPT
// Version: 2.1.0
// Created: 24/07/2026
// ============================================================================

'use strict';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines confidence based on available runs.
 *
 * @param {number} runs
 * @returns {string}
 */
function getConfidence(runs) {

    if (runs >= 6)
        return 'High';

    if (runs >= 4)
        return 'Medium';

    return 'Low';

}

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Analyse a runner's enriched form.
 *
 * @param {Object} runner
 * @returns {Object}
 */
function analyse(runner) {

    const form = runner.form || {};

    let score = 0;

    score += (form.momentum ?? 50) * 0.40;
    score += (form.consistency ?? 50) * 0.30;
    score += (form.wins ?? 0) * 5;
    score += (form.places ?? 0) * 2;

	// -----------------------------------------------------------------------------
	// Enhanced Form Metrics
	// -----------------------------------------------------------------------------

	if (form.trend === 'Improving')
		score += 5;

	else if (form.trend === 'Declining')
		score -= 5;

	if (form.strikeRate >= 50)
		score += 4;

	if (form.placeRate >= 75)
		score += 3;

	if (form.nonFinishers >= 2)
		score -= 3;

    if (form.lastRun === 1)
        score += 10;


    score = Math.min(100, Math.round(score));




    return {

        engine: 'form',

        score,

        confidence: getConfidence(form.positions?.length ?? 0),

        reasons: [
            `Recent form: ${form.raw || 'Unknown'}`
        ],
		metrics: {
			runs: form.runs,
			wins: form.wins,
			places: form.places,
			strikeRate: form.strikeRate,
			placeRate: form.placeRate,
			trend: form.trend,
			momentum: form.momentum,
			consistency: form.consistency,
			nonFinishers: form.nonFinishers
		}

    };

}

// ============================================================================
// Module Exports
// ============================================================================

module.exports = {

    analyse

};

// ============================================================================
// End of File
// ============================================================================