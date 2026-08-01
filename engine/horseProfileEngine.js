// ./engine/horseProfileEngine.js

const STYLE_KEYWORDS = {
    LEADER: [
        "made all",
        "soon led",
        "led",
        "set pace",
        "dictated"
    ],
    PROMINENT: [
        "chased leader",
        "tracked leader",
        "tracked leaders",
        "prominent",
        "close up"
    ],
    MIDFIELD: [
        "midfield",
        "mid-division",
        "mid division",
        "in touch"
    ],
    HELD_UP: [
        "held up",
        "towards rear",
        "rear",
        "last",
        "restrained",
        "slowly away",
        "slowly into stride"
    ]
};
const STYLE_SCORES = {
    LEADER: [
        ["made all", 5],
        ["soon led", 4],
        ["led", 3],
        ["set pace", 4],
        ["dictated", 4]
    ],

    PROMINENT: [
        ["tracked leader", 4],
        ["tracked leaders", 4],
        ["chased leader", 4],
        ["prominent", 3],
        ["close up", 2]
    ],

    MIDFIELD: [
        ["midfield", 3],
        ["mid-division", 3],
        ["mid division", 3],
        ["in touch", 2]
    ],

    HELD_UP: [
        ["held up", 5],
        ["towards rear", 4],
        ["rear", 3],
        ["last", 3],
        ["restrained", 4],
        ["slowly away", 4],
        ["slowly into stride", 4]
    ]
};

function scoreRunningStyle(description = "") {

    const text = description.toLowerCase();

    const scores = {
        LEADER:0,
        PROMINENT:0,
        MIDFIELD:0,
        HELD_UP:0
    };

    for (const [style, words] of Object.entries(STYLE_SCORES)) {
        for (const [phrase, weight] of words) {
            if (text.includes(phrase)) {
                scores[style] += weight;
            }
        }
    }

    return scores;
}

function buildHorseProfile(runner) {

    const counts = {
        LEADER: 0,
        PROMINENT: 0,
        MIDFIELD: 0,
        HELD_UP: 0,
        UNKNOWN: 0
    };


	for (const run of runner.past_results || []) {

		const scores = scoreRunningStyle(run.ride_description);

		counts.LEADER += scores.LEADER;
		counts.PROMINENT += scores.PROMINENT;
		counts.MIDFIELD += scores.MIDFIELD;
		counts.HELD_UP += scores.HELD_UP;

	}

	const total =
    counts.LEADER +
    counts.PROMINENT +
    counts.MIDFIELD +
    counts.HELD_UP;

	if (!total) {
		return {
			running_style: "UNKNOWN",
			running_style_confidence: 0,
			style_scores: counts,
			style_distribution: {
				LEADER: 0,
				PROMINENT: 0,
				MIDFIELD: 0,
				HELD_UP: 0
			},
			sample_size: 0
		};
	}

	const styleDistribution = {
		LEADER: Math.round(counts.LEADER * 100 / total),
		PROMINENT: Math.round(counts.PROMINENT * 100 / total),
		MIDFIELD: Math.round(counts.MIDFIELD * 100 / total),
		HELD_UP: Math.round(counts.HELD_UP * 100 / total)
	};

    const winner = Object.entries(counts)
        .filter(([k]) => k !== "UNKNOWN")
        .sort((a, b) => b[1] - a[1])[0];


	return {
		running_style: winner[0],
		running_style_confidence: Math.round((winner[1] / total) * 100),

		style_scores: counts,
		style_distribution: styleDistribution,

		sample_size: runner.past_results.length
	};

}

module.exports = {
    build: buildHorseProfile,
    scoreRunningStyle
};