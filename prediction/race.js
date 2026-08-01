'use strict';

const history = require('../history');
const predictHorse = require('./engine');

module.exports = function predictRace(race, meeting) {

    const results = [];

    for (const runner of race.runners) {

        const horse = history.getHorse(runner.id);

        if (!horse)
            continue;

        const prediction = predictHorse(horse, {
            distance: race.distance,
            going: meeting.going,
            raceClass: race.race_class
        });

        results.push({
            horse: runner.name,
            trainer: runner.trainer,
            jockey: runner.jockey,
            draw: runner.draw,
            prediction
        });
    }

    results.sort((a, b) => b.prediction.rating - a.prediction.rating);

    return results;
};