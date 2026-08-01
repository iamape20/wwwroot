// ============================================================================
// File: backend/prediction/models/conditions.js
// Description: Calculates the Conditions model score.
// ============================================================================

'use strict';

module.exports = function conditionsModel(analysis) {

    const factors = [
        analysis.course,
        analysis.distance,
        analysis.going,
        analysis.class
    ];

    const matched = factors.filter(f => f && f.matched);

    if (matched.length === 0) {

        return {

            score: 0,

            confidence: 0,

            matched: 0,

            total: factors.length

        };

    }

    const score = Math.round(

        matched.reduce((t, f) => t + f.score, 0) / matched.length

    );

    return {

        score,

        confidence: Math.round((matched.length / factors.length) * 100),

        matched: matched.length,

        total: factors.length

    };

};