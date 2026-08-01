'use strict';

module.exports = function analyseRatings(horse) {

    const reasons = [];
    const risks = [];
    let score = 0;

    if (!horse.past_results || horse.past_results.length === 0) {

        risks.push('No rating history');

        return {
            score,
            reasons,
            risks
        };
    }

    const ratings = horse.past_results
        .map(r => Number(r.official_rating))
        .filter(Number.isFinite);

    if (ratings.length === 0) {

        risks.push('No official ratings');

        return {
            score,
            reasons,
            risks
        };
    }

    const current = ratings[0];
    const peak = Math.max(...ratings);

    // Current rating
    if (current >= 100) {

        score += 5;
        reasons.push(`High current OR (${current})`);

    } else if (current >= 90) {

        score += 3;
        reasons.push(`Competitive OR (${current})`);

    }

    // Previous peak
    if (peak > current) {

        const diff = peak - current;

        if (diff <= 5) {

            score += 2;
            reasons.push(`Only ${diff} lb below career peak`);

        } else {

            risks.push(`${diff} lb below career peak`);

        }
    }

    // Trend
    if (ratings.length >= 3) {

        const recent = ratings.slice(0, 3);

        if (recent[0] > recent[1] && recent[1] > recent[2]) {

            reasons.push('Official rating improving');
            score += 3;

        } else if (recent[0] < recent[1] && recent[1] < recent[2]) {

            risks.push('Official rating declining');
            score -= 2;

        }
    }

    return {
        score,
        reasons,
        risks
    };

};