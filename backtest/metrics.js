'use strict';

module.exports = function calculateMetrics(results) {

    let winnerCorrect = 0;
    let top3Correct = 0;

    for (const race of results) {

        if (race.predictedWinner === race.actualWinner)
            winnerCorrect++;

        if (race.top3Hit)
            top3Correct++;

    }

    return {

        races: results.length,

        winnerAccuracy:
            winnerCorrect / results.length,

        top3Accuracy:
            top3Correct / results.length

    };

};