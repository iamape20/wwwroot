'use strict';

module.exports = function analyseConsistency(horse, race) {

    const reasons = [];
    const risks = [];

    const results = horse.past_results || [];

    if (results.length < 5) {
        risks.push('Limited race history');

        return {
            score: 5,
            reasons,
            risks
        };
    }

    const recent = results.slice(0, 10);

    const wins = recent.filter(r => r.pos === 1).length;
    const places = recent.filter(r => r.pos >= 1 && r.pos <= 3).length;
    const unplaced = recent.filter(r => r.pos > 6).length;

    let score = 5;

    if (wins >= 3) {
        score += 2;
        reasons.push(`${wins} wins from last ${recent.length} runs`);
    }

    if (places >= 5) {
        score += 2;
        reasons.push(`${places} placed finishes`);
    }

    if (unplaced >= 5) {
        score -= 2;
        risks.push('Frequently finishes unplaced');
    }

    score = Math.max(0, Math.min(score, 10));

    return {
        score,
        reasons,
        risks
    };

};