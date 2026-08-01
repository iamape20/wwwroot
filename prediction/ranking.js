// ============================================================================
// File: backend/prediction/ranking.js
// Description: Sorts predictions into finishing order.
// ============================================================================

'use strict';

module.exports = function rankRace(predictions = []) {

    const ranked = [...predictions].sort((a, b) => {

        if (b.score !== a.score) {
            return b.score - a.score;
        }

        return b.confidence - a.confidence;
    });

    return ranked.map((runner, index) => ({
        ...runner,
        rank: index + 1
    }));
}