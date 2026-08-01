'use strict';

module.exports = function analyseCourse(horse, race) {

    const reasons = [];
    const risks = [];
    let score = 0;

    if (!race || !race.course) {
        risks.push('Course not supplied');
        return { score, reasons, risks };
    }

	if (!Array.isArray(horse.past_results)) {

		risks.push('No past results available');

		return {
			score: 5,
			reasons,
			risks
		};

	}

	const runs = horse.past_results.filter(
		r => r.course === race.course
	);

	if (runs.length === 0) {

		risks.push('No previous runs at this course');

		return {
			score: 5,
			reasons,
			risks
		};

	}

    const wins = runs.filter(r => Number(r.pos) === 1).length;
    const places = runs.filter(r => Number(r.pos) <= 3).length;

    score = 5;
    score += Math.min(runs.length, 3);
    score += wins * 2;

    if (places > wins) {
        score += 1;
    }

    score = Math.min(score, 10);

    reasons.push(`${runs.length} previous run(s) here`);

    if (wins > 0) {
        reasons.push(`${wins} course win(s)`);
    }

    if (places > wins) {
        reasons.push(`${places} place(s) at this course`);
    }

    return {
        score,
        reasons,
        risks
    };
};