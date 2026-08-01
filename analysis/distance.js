'use strict';

function toFurlongs(dist) {

    if (!dist)
        return null;

    dist = dist.toLowerCase().trim();

    let total = 0;

    const miles = dist.match(/(\d+)m/);
    const furlongs = dist.match(/(\d+)f/);

    if (miles)
        total += parseInt(miles[1], 10) * 8;

    if (furlongs)
        total += parseInt(furlongs[1], 10);

    return total || null;
}

module.exports = function analyseDistance(horse, race) {

    const reasons = [];
    const risks = [];

    if (!race || !race.distance || !horse.past_results?.length) {
        return {
            score: 0,
            reasons,
            risks
        };
    }

    const today = toFurlongs(race.distance);
	
	
	
    if (!today) {
        risks.push('Unable to interpret race distance');
        return {
            score: 0,
            reasons,
            risks
        };
    }

    let exact = 0;
    let similar = 0;
    let wins = 0;

    for (const run of horse.past_results) {

        const historic = toFurlongs(run.dist);

        if (!historic)
            continue;

        if (historic === today) {

            exact++;

            if (run.pos === 1)
                wins++;

        }
        else if (Math.abs(historic - today) <= 1) {

            similar++;
        }
    }

    let score = 0;

    if (wins >= 2)
        score = 10;
    else if (wins === 1)
        score = 8;
    else if (exact >= 3)
        score = 6;
    else if (similar >= 3)
        score = 4;
    else if (exact > 0 || similar > 0)
        score = 2;

    if (exact > 0)
        reasons.push(`${exact} previous run(s) over today's trip`);

    if (similar > 0)
        reasons.push(`${similar} run(s) over a similar distance`);

    if (wins > 0)
        reasons.push(`${wins} win(s) at today's distance`);

    if (exact === 0 && similar === 0)
        risks.push('Unproven over this distance');

    return {
        score,
        reasons,
        risks
    };
};