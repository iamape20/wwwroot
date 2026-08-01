'use strict';

const formAnalysis = require('../analysis/form');
const speedAnalysis = require('../analysis/speed');
const classAnalysis = require('../analysis/class');
const trainerAnalysis = require('../analysis/trainer');
const jockeyAnalysis = require('../analysis/jockey');
const goingAnalysis = require('../analysis/going');
const drawAnalysis = require('../analysis/draw');
const paceAnalysis = require('../analysis/pace');

const confidence = require('./confidence');
const verdict = require('./verdict');

const WEIGHTS = {
    form: 0.25,
    speed: 0.20,
    class: 0.15,
    pace: 0.10,
    trainer: 0.10,
    jockey: 0.10,
    going: 0.05,
    draw: 0.05
};

function predictHorse(runner, history) {

    const scores = {

        form: formAnalysis(runner, history),
        speed: speedAnalysis(runner, history),
        class: classAnalysis(runner, history),
        pace: paceAnalysis(runner, history),
        trainer: trainerAnalysis(runner, history),
        jockey: jockeyAnalysis(runner, history),
        going: goingAnalysis(runner, history),
        draw: drawAnalysis(runner, history)

    };

    let rating = 0;

    for (const key of Object.keys(scores)) {

        rating += scores[key] * WEIGHTS[key];

    }

    rating = Number(rating.toFixed(2));

    const conf = confidence(rating);

    return {

        horseId: runner.id,
        horse: runner.name,

        rating,

        confidence: conf,

        verdict: verdict(conf),

        breakdown: scores

    };

}

module.exports = predictHorse;