// ============================================================================
// File: backend/prediction/models/connections.js
// Description: Calculates the Connections model score.
// ============================================================================

'use strict';

module.exports = function connectionsModel(analysis) {

    const factors = [
        analysis.trainer,
        analysis.jockey
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