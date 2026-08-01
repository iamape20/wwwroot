'use strict';

module.exports = function analyseTrainer(horse, race) {

    const reasons = [];
    const risks = [];

    const trainer = horse.trainer;

    if (!trainer || !trainer.metrics) {
        risks.push('Trainer statistics unavailable');

        return {
            score: 5,
            reasons,
            risks
        };
    }

    let score = 5;

    const overall = trainer.metrics.overall || {};
    const last14 = trainer.metrics.last14Days || {};

    //
    // Overall strike rate
    //

    const strikeRate = overall.strikeRate || 0;

    if (strikeRate >= 20) {
        score += 2;
        reasons.push(`Trainer strike rate ${strikeRate}%`);
    }
    else if (strikeRate >= 15) {
        score += 1;
        reasons.push(`Trainer strike rate ${strikeRate}%`);
    }
    else if (strikeRate < 8) {
        score -= 2;
        risks.push(`Low trainer strike rate (${strikeRate}%)`);
    }

    //
    // Recent form (last 14 days)
    //

    const recentRate = last14.strikeRate || 0;

    if (recentRate >= 20) {
        score += 2;
        reasons.push('Trainer in excellent recent form');
    }
    else if (recentRate >= 10) {
        score += 1;
        reasons.push('Trainer in good recent form');
    }

    //
    // Course statistics
    //

    if (trainer.metrics.course && horse.course_code) {

        const course = trainer.metrics.course[horse.course_code];

        if (course) {

            if (course.strikeRate >= 25) {
                score += 2;
                reasons.push('Strong trainer record at this course');
            }
            else if (course.placeRate >= 50) {
                score += 1;
                reasons.push('Trainer regularly places runners here');
            }
        }
    }

    //
    // Going statistics
    //

    if (trainer.metrics.going && horse.going) {

        const going = trainer.metrics.going[horse.going];

        if (going) {

            if (going.strikeRate >= 20) {
                score += 2;
                reasons.push('Trainer performs well on this going');
            }
            else if (going.placeRate >= 50) {
                score += 1;
                reasons.push('Trainer often places runners on this going');
            }
        }
    }

    score = Math.max(0, Math.min(score, 10));

    return {
        score,
        reasons,
        risks
    };

};