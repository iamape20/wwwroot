'use strict';
// ./engine/raceEngine.js

const predictor = require("../engine-v2/predictor");
const formProfileEngine = require("../formProfileEngine");

async function analyseRace(meeting) {

    for (const race of meeting.races) {

        for (const runner of race.runners) {
            runner.form = formProfileEngine.build(runner);
        }

        const prediction = predictor.predictRace(race);

        // predictor.predictRace() already runs horseProfileEngine internally
        // (wired in via predictor.js), so runner.horse_profile is populated
        // as a side effect here — no separate call needed.

        for (const result of prediction.runners) {

            result.runner.power_rating = result.score;
            result.runner.confidence = result.confidence.score;
            result.runner.confidence_grade = result.confidence.grade;
            result.runner.rating_breakdown = result.breakdown;
            result.runner.engine_details = result.engines;

        }

        race.runners.sort(
            (a, b) => (b.power_rating || 0) - (a.power_rating || 0)
        );

    }

    return meeting;
}

module.exports = {
    analyseRace
};
