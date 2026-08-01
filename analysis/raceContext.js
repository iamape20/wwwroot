'use strict';

module.exports = function analyseRaceContext(horse, race) {

    const reasons = [];
    const risks = [];

    let score = 5;

    //
    // Field size
    //

    if (typeof race.runners === 'number') {

        if (race.runners <= 6) {
            score += 1;
            reasons.push('Small field');
        }

        if (race.runners >= 14) {
            score -= 1;
            risks.push('Large competitive field');
        }

    }

    //
    // Handicap
    //

    if (race.handicap === true)
        reasons.push('Handicap race');

    //
    // Surface
    //

    if (race.surface)
        reasons.push(`Surface: ${race.surface}`);

    //
    // Race type
    //

    if (race.type)
        reasons.push(`Race: ${race.type}`);

    score = Math.max(0, Math.min(score, 10));

    return {
        score,
        reasons,
        risks
    };

};