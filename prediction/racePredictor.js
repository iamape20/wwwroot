'use strict';

const predictHorse = require('./engine');

module.exports = function predictRace(runners, race) {

    const predictions = [];

    for (const horse of runners) {

        predictions.push(
            predictHorse(horse, race)
        );

    }

    predictions.sort(
        (a, b) => b.rating - a.rating
    );

    predictions.forEach((prediction, index) => {
        prediction.rank = index + 1;
    });

    return predictions;

};