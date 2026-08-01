// ============================================================================
// File: formAnalyser.js
// Description: Analyses tokenised Sporting Life form
// ============================================================================

'use strict';

const NON_FINISHERS = new Set([
    'PU',
    'UR',
    'BD',
    'RR',
    'RO',
    'F',
    'U',
    'R'
]);

function analyseForm(tokens) {

    const positions = [];
    let nonFinishers = 0;

    for (const token of tokens) {

        if (/^\d$/.test(token)) {
            positions.push(Number(token));
            continue;
        }

        if (NON_FINISHERS.has(token)) {
            nonFinishers++;
        }
    }

    const wins = positions.filter(p => p === 1).length;
    const places = positions.filter(p => p <= 3).length;
	const runs = positions.length;

	const strikeRate =
    runs
        ? Number(((wins / runs) * 100).toFixed(1))
        : 0;
		
	const placeRate =
    runs
        ? Number(((places / runs) * 100).toFixed(1))
        : 0;
		
	function average(values) {

		if (!values.length)
			return null;

		return values.reduce((a, b) => a + b, 0) / values.length;

	}

	const split = Math.floor(runs / 2);

	const olderRuns = positions.slice(0, split);
	const recentRuns = positions.slice(split);

	const olderAverage = average(olderRuns);
	const recentAverage = average(recentRuns);

	let trend = 'Stable';

	if (olderAverage !== null && recentAverage !== null) {

		if (recentAverage < olderAverage)
			trend = 'Improving';

		else if (recentAverage > olderAverage)
			trend = 'Declining';

	}

		
return {

    positions,

    runs,

    wins,

    places,

    strikeRate,

    placeRate,

    olderRuns,

    recentRuns,

    olderAverage,

    recentAverage,

    trend,

    nonFinishers

};

}

module.exports = {
    analyseForm
};

// ============================================================================
// End of File
// ============================================================================