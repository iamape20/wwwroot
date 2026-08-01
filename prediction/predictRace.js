'use strict';

const predictHorse = require('./engine');
const calculatePace = require('./paceCalculator');
const applyPaceImpact = require('./paceImpact');

module.exports = function predictRace(race) {

    let predictions = race.runners.map(horse => predictHorse(horse, race));
    const pace = calculatePace(predictions);

    predictions = predictions.map(prediction => {

		const paceResult = applyPaceImpact(
			prediction.analyses.runningStyle?.style,
			pace.expectedPace
		);

		const rating = Math.max(
			0,
			Math.min(10, prediction.rating + paceResult.adjustment)
		);

		return {
			...prediction,
			paceAdjustment: paceResult,
			rating: Number(rating.toFixed(2))
		};

    });


    predictions.sort((a, b) => b.rating - a.rating);

    return {

        race: {
            course: race.course,
            time: race.time,
            pace
        },

        predictions

    };

};