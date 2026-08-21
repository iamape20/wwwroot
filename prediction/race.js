'use strict';

const history = require('../history');
const predictHorse = require('./engine');

module.exports = function predictRace(race, meeting) {

    const results = [];

    for (const runner of race.runners) {

        const horse = history.getHorse(runner.id);

        if (!horse)
            continue;

        // --------------------------------------------------
        // Today's trainer / jockey
        // stage2_cards.json is the authoritative source
        // --------------------------------------------------

        const trainer = history.getTrainer(runner.trainer_id);
        const jockey = history.getJockey(runner.jockey_id);

        // Attach today's connections to the horse object
        // so the analysis modules can use their statistics.
        horse.trainer = trainer;
        horse.jockey = jockey;

        // --------------------------------------------------
        // Race context
        // --------------------------------------------------

        const prediction = predictHorse(horse, {
            distance: race.distance,
            going: meeting.going,
            raceClass: race.race_class,
            course: meeting.name,
            runners: race.runners.length,
            handicap: race.handicap,
            surface: race.surface,
            type: race.type
        });

        results.push({
            horse: runner.name,
            trainer: runner.trainer,
            jockey: runner.jockey,
            draw: runner.draw,
            prediction
        });
    }

    results.sort(
        (a, b) =>
            b.prediction.rating -
            a.prediction.rating
    );

    return results;
};