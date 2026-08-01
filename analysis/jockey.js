'use strict';

module.exports = function analyseJockey(horse) {

    const reasons = [];
    const risks = [];
    const jockey = horse.jockey;

    if (!jockey || !jockey.metrics) {
        return {
            score: 5,
            reasons,
            risks: ['Jockey statistics unavailable']
        };
    }

    let score = 5;


    const overall = jockey.metrics.overall || {};
    const strikeRate = overall.strikeRate || 0;

    if (strikeRate >= 20) {
        score += 2;
        reasons.push(`Jockey strike rate ${strikeRate}%`);
    }
    else if (strikeRate >= 15) {
        score += 1;
        reasons.push(`Jockey strike rate ${strikeRate}%`);
    }
    else if (strikeRate < 8) {
        score -= 2;
        risks.push(`Low jockey strike rate (${strikeRate}%)`);
    }

    //
    // Recent form (14 days)
    //

    const recent = jockey.metrics.last14Days || {};

    if (recent.strikeRate >= 20) {
        score += 2;
        reasons.push('Jockey in excellent recent form');
    }
    else if (recent.strikeRate >= 10) {
        score += 1;
        reasons.push('Jockey in good recent form');
    }

    //
    // Course record
    //

    if (horse.course_code && jockey.metrics.course) {

        const course = jockey.metrics.course[horse.course_code];

        if (course && course.runs >= 5) {

            if (course.strikeRate >= 20) {
                score += 2;
                reasons.push('Excellent jockey record at this course');
            }
            else if (course.placeRate >= 45) {
                score += 1;
                reasons.push('Jockey often places at this course');
            }
        }
    }

    //
    // Going record
    //

    if (horse.going && jockey.metrics.going) {

        const going = jockey.metrics.going[horse.going];

        if (going && going.runs >= 5) {

            if (going.strikeRate >= 20) {
                score += 2;
                reasons.push('Jockey performs well on this going');
            }
            else if (going.placeRate >= 45) {
                score += 1;
                reasons.push('Jockey often places on this going');
            }
        }
    }

    //
    // Trainer / jockey partnership
    //

    if (horse.trainer?.id && jockey.metrics.trainer) {

        const combo = jockey.metrics.trainer[String(horse.trainer.id)];

        if (combo && combo.runs >= 5) {

            if (combo.strikeRate >= 20) {
                score += 2;
                reasons.push('Excellent trainer/jockey partnership');
            }
            else if (combo.placeRate >= 45) {
                score += 1;
                reasons.push('Strong trainer/jockey partnership');
            }
        }
    }

    score = Math.max(0, Math.min(10, score));

    return {
        score,
        reasons,
        risks
    };
};