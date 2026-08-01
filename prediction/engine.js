'use strict';

const ENGINE_VERSION = "1.0.0";
const WEIGHT_PROFILE = "default";
const calculateConfidence = require('./confidence');
const analyseHorse = require('../analysis');
const modules = require('../analysis/modules');
const weights = require('../config/weights.json');

module.exports = function predictHorse(horse, race) {

    const analyses = analyseHorse(horse, race);

    let weightedScore = 0;
    let totalWeight = 0;
	const weightedScores = {};

	for (const module of modules) {

		const result = analyses[module.name];
		if (!result) continue;

		const weight = weights[module.name] ?? 1;
		const contribution = result.score * weight;

		weightedScores[module.name] = {
			score: result.score,
			weight,
			contribution: Number(contribution.toFixed(2))
		};

		weightedScore += contribution;
		totalWeight += weight;
	}

    const rating = totalWeight
        ? weightedScore / totalWeight
        : 0;

	const confidence = calculateConfidence(horse, analyses);
	
	return {

		engine: {
			version: ENGINE_VERSION,
			profile: WEIGHT_PROFILE,
			generated: new Date().toISOString()
		},

		horseId: horse.id,
		horse: horse.name,

		rating: Number(rating.toFixed(2)),
		confidence,

		weightedScores,

		analyses
	};

};