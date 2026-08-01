'use strict';

const config = require('../config/pace.json');

module.exports = function paceImpact(style, expectedPace) {

    if (!style || !expectedPace) {
        return {
            adjustment: 0,
            reason: 'No pace adjustment applied.'
        };
    }

    const adjustment =
        config.impact?.[style]?.[expectedPace] ?? 0;

    let reason = 'No pace bias.';

    if (adjustment > 0) {
        reason = `${expectedPace} pace favours ${style.toLowerCase()} horses.`;
    }
    else if (adjustment < 0) {
        reason = `${expectedPace} pace disadvantages ${style.toLowerCase()} horses.`;
    }

    return {
        adjustment,
        reason
    };

};