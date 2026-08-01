'use strict';

module.exports = function analyseClass(horse, race) {

    const reasons = [];
    const risks = [];

    if (!race || !race.raceClass || !horse.past_results?.length) {
        return {
            score: 0,
            reasons,
            risks
        };
    }

    const todayClass = parseInt(race.raceClass, 10);

    const classes = horse.past_results
        .map(r => parseInt(r.class, 10))
        .filter(Number.isFinite);

    if (classes.length === 0) {
        risks.push('No previous class data');
        return {
            score: 0,
            reasons,
            risks
        };
    }

    const avgClass =
        classes.reduce((a, b) => a + b, 0) / classes.length;

    let score = 0;

    // Lower class number = higher quality race.
    if (todayClass > avgClass) {
        score = 10;
        reasons.push('Dropping in class');
    }
    else if (Math.abs(avgClass - todayClass) < 0.5) {
        score = 7;
        reasons.push('Competing at familiar class');
    }
    else {
        score = 3;
        risks.push('Stepping up in class');
    }

    return {
        score,
        reasons,
        risks
    };
};