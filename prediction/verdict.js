// ============================================================================
// File: backend/prediction/verdict.js
// Description: Converts a prediction score into a racing verdict.
// ============================================================================

'use strict';

module.exports = function getVerdict(score = 0) {

    score = Number(score) || 0;

    if (score >= 90) return 'Outstanding Chance';
    if (score >= 80) return 'Strong Chance';
    if (score >= 70) return 'Good Chance';
    if (score >= 60) return 'Each-Way Chance';
    if (score >= 50) return 'Outside Chance';

    return 'Unlikely';
};