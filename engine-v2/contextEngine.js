'use strict';

function analyse(runner) {

    const history = runner.history || {};

    let score = 0;
    const reasons = [];

    // Average OR
    if (history.averageOR >= 100) {
        score += 30;
        reasons.push(`Average OR ${history.averageOR}`);
    } else if (history.averageOR >= 90) {
        score += 20;
        reasons.push(`Average OR ${history.averageOR}`);
    } else if (history.averageOR >= 80) {
        score += 10;
        reasons.push(`Average OR ${history.averageOR}`);
    }

    // Wins
    if (history.wins) {
        const pts = Math.min(history.wins * 5, 20);
        score += pts;
        reasons.push(`${history.wins} win${history.wins === 1 ? '' : 's'}`);
    }

    // Places
    if (history.places) {
        const pts = Math.min(history.places * 2, 10);
        score += pts;
        reasons.push(`${history.places} place${history.places === 1 ? '' : 's'}`);
    }

    // Average finish
    if (history.averageFinish > 0) {

        if (history.averageFinish <= 2) {
            score += 20;
            reasons.push(`Average finish ${history.averageFinish}`);
        }
        else if (history.averageFinish <= 3) {
            score += 10;
            reasons.push(`Average finish ${history.averageFinish}`);
        }

    }

    // Freshness
    if (typeof history.daysSinceRun === 'number') {

        if (history.daysSinceRun >= 7 &&
            history.daysSinceRun <= 45) {

            score += 20;

        } else {

            score += 10;

        }

        reasons.push(`Ran ${history.daysSinceRun} days ago`);
    }

    score = Math.min(score, 100);

    let confidence = 'Low';

    if (score >= 75)
        confidence = 'High';
    else if (score >= 50)
        confidence = 'Medium';

    return {

        engine: 'context',

        score,

        confidence,

        reasons,

        metrics: {

            averageOR: history.averageOR || 0,
            wins: history.wins || 0,
            places: history.places || 0,
            averageFinish: history.averageFinish || 0,
            daysSinceRun: history.daysSinceRun

        }

    };

}

module.exports = {
    analyse
};