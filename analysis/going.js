'use strict';

module.exports = function analyseGoing(horse) {

    const reasons = [];
    const risks = [];

    const todayGoing = horse.going;

    if (!todayGoing || !horse.past_results?.length) {
        return {
            score: 0,
            reasons,
            risks
        };
    }

    const matchingRuns = horse.past_results.filter(r =>
        r.going &&
        r.going.toLowerCase() === todayGoing.toLowerCase()
    );

    if (matchingRuns.length === 0) {
        risks.push(`No previous runs on ${todayGoing}`);
        return {
            score: 0,
            reasons,
            risks
        };
    }

    const wins = matchingRuns.filter(r => r.pos === 1).length;
    const places = matchingRuns.filter(r => r.pos <= 3).length;

    let score = 0;

    if (wins >= 2)
        score = 10;
    else if (wins === 1)
        score = 8;
    else if (places >= 2)
        score = 6;
    else if (places === 1)
        score = 4;
    else
        score = 2;

    reasons.push(
        `${matchingRuns.length} previous run(s) on ${todayGoing}`
    );

    if (wins > 0)
        reasons.push(`${wins} win(s) on this going`);

    return {
        score,
        reasons,
        risks
    };
};