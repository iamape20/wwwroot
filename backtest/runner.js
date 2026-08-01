'use strict';

const predictHorse = require('../prediction/engine');

module.exports = function runRace(race) {

    const predictions = [];

    for (const horse of race.runners) {

        predictions.push({
            horse,
            prediction: predictHorse(horse, race)
        });

    }

    predictions.sort(
        (a, b) =>
            b.prediction.rating - a.prediction.rating
    );

    return predictions;

};