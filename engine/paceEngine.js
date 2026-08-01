// paceEngine.js

const PACE_MATRIX = {
    CRAWL: {
        LEADER: 10,
        PROMINENT: 5,
        MIDFIELD: -2,
        HELD_UP: -8
    },

    SLOW: {
        LEADER: 6,
        PROMINENT: 3,
        MIDFIELD: 0,
        HELD_UP: -4
    },

    EVEN: {
        LEADER: 0,
        PROMINENT: 0,
        MIDFIELD: 0,
        HELD_UP: 0
    },

    STRONG: {
        LEADER: -6,
        PROMINENT: 2,
        MIDFIELD: 4,
        HELD_UP: 8
    },

    BURN_UP: {
        LEADER: -12,
        PROMINENT: -5,
        MIDFIELD: 6,
        HELD_UP: 12
    }
};

function analysePace(runners) {

    let leaderPressure = 0;
    let prominentPressure = 0;
    let midfieldPressure = 0;
    let heldUpPressure = 0;

    for (const runner of runners) {

        const d = runner.horse_profile?.style_distribution;

        if (!d) continue;

        leaderPressure += d.LEADER / 100;
        prominentPressure += d.PROMINENT / 100;
        midfieldPressure += d.MIDFIELD / 100;
        heldUpPressure += d.HELD_UP / 100;
    }

    const expectedLeaders =
        leaderPressure +
        (prominentPressure * 0.35);

    let expectedPace = "EVEN";

    if (expectedLeaders < 0.8)
        expectedPace = "CRAWL";
    else if (expectedLeaders < 1.5)
        expectedPace = "SLOW";
    else if (expectedLeaders < 2.5)
        expectedPace = "EVEN";
    else if (expectedLeaders < 3.5)
        expectedPace = "STRONG";
    else
        expectedPace = "BURN_UP";

    const bias = PACE_MATRIX[expectedPace];

	for (const runner of runners) {

		const d = runner.horse_profile?.style_distribution;

		if (!d) {
			runner.pace_profile = {
				expected_pace: expectedPace,
				pace_score: 0,
				pace_advantage: false
			};
			continue;
		}

		const paceScore =
			(d.LEADER * bias.LEADER +
			 d.PROMINENT * bias.PROMINENT +
			 d.MIDFIELD * bias.MIDFIELD +
			 d.HELD_UP * bias.HELD_UP) / 100;

		runner.pace_profile = {
			expected_pace: expectedPace,
			pace_score: Number(paceScore.toFixed(2)),
			pace_advantage: paceScore > 3
		};
	}
    return {

        expected_pace: expectedPace,

        leader_pressure: Number(leaderPressure.toFixed(2)),

        prominent_pressure: Number(prominentPressure.toFixed(2)),

        midfield_pressure: Number(midfieldPressure.toFixed(2)),

        held_up_pressure: Number(heldUpPressure.toFixed(2))
    };
}

module.exports = {
    analysePace
};