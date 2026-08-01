// probabilityEngine.js

function calculateProbabilities(runners) {

    // ----------------------------
    // STEP 1 - Build raw scores
    // ----------------------------

    for (const runner of runners) {
const powerContribution =
    (runner.power_rating || 0) * 0.40;

const strategyContribution =
    (runner.calculated_strategy_rating || 0) * 0.20;

const paceContribution =
    (runner.pace_profile?.pace_score || 0) * 1.50;

const verificationContribution =
    (runner.cross_verification?.rate || 0) * 0.05;

const styleContribution =
    (runner.horse_profile?.running_style_confidence || 0) * 0.05;

const officialContribution =
    (parseFloat(runner.official_rating) || 0) * 0.10;

const score =
      powerContribution
    + strategyContribution
    + paceContribution
    + verificationContribution
    + styleContribution
    + officialContribution;

runner.raw_probability_score = score;

runner._probabilityBreakdown = {
    power_rating: Number(powerContribution.toFixed(2)),
    strategy_rating: Number(strategyContribution.toFixed(2)),
    pace: Number(paceContribution.toFixed(2)),
    verification: Number(verificationContribution.toFixed(2)),
    style_confidence: Number(styleContribution.toFixed(2)),
    official_rating: Number(officialContribution.toFixed(2))
};
    }

    // ----------------------------
    // STEP 2 - Softmax
    // ----------------------------

    const expScores = runners.map(r =>
        Math.exp((r.raw_probability_score || 0) / 20)
    );

    const total =
        expScores.reduce((sum, value) => sum + value, 0);

    // ----------------------------
    // STEP 3 - Final probabilities
    // ----------------------------

    runners.forEach((runner, index) => {
        const probability =
            total > 0
                ? (expScores[index] / total) * 100
                : 0;

		runner.probability = {
			raw_score: Number(runner.raw_probability_score.toFixed(2)),
			win_probability: Number(probability.toFixed(2)),
			fair_odds:
				probability > 0
					? Number((100 / probability).toFixed(2))
					: null,
			breakdown: runner._probabilityBreakdown
		};

		delete runner._probabilityBreakdown;
    });
	
	
	
	
    return runners;
	
}

module.exports = {
    calculateProbabilities
};