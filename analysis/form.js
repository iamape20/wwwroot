'use strict';

function scoreRecentResults(results, reasons, risks) {

    if (!results || results.length === 0) {
        risks.push('No previous race history');
        return 0;
    }

    let score = 0;

    const recent = results.slice(0, 5);

    for (const race of recent) {

        switch (race.pos) {

            case 1: score += 4; break;
            case 2: score += 3; break;
            case 3: score += 2; break;
            case 4:
            case 5: score += 1; break;
        }
    }

    if (score >= 12)
        reasons.push('Excellent recent form');
    else if (score >= 8)
        reasons.push('Consistent recent form');
    else if (score <= 2)
        risks.push('Poor recent finishing positions');

    return Math.min(score, 10);
}

function scoreConsistency(results, reasons) {

    if (!results || results.length < 3)
        return 0;

    const recent = results.slice(0, 5);

    const placed = recent.filter(r => r.pos <= 3).length;

    if (placed >= 3) {
        reasons.push('Consistently placed');
        return 5;
    }

    if (placed >= 2)
        return 3;

    if (placed >= 1)
        return 1;

    return 0;
}

function scoreRecency(horse, reasons, risks) {

    if (!horse.last_run_date)
        return 0;

    const today = new Date();
    const lastRun = new Date(horse.last_run_date);

    const days = Math.floor(
        (today - lastRun) / 86400000
    );

    if (days <= 30) {
        reasons.push('Recently raced');
        return 5;
    }

    if (days <= 60)
        return 3;

    if (days <= 120)
        return 1;

    risks.push('Long absence');

    return 0;
}

function scoreRatings(results, reasons) {

    if (!results || results.length < 2)
        return 0;

    const latest = results[0].official_rating;
    const previous = results[1].official_rating;

    if (
        typeof latest !== 'number' ||
        typeof previous !== 'number'
    )
        return 0;

    if (latest > previous) {
        reasons.push('Official rating improving');
        return 3;
    }

    return 0;
}

function scoreTimeform(horse, reasons, risks) {

    if (!horse.timeform_info)
        return 0;

    const stars = horse.timeform_info.star_rating || 0;

    if (stars >= 4) {
        reasons.push('Strong Timeform rating');
        return 2;
    }

    if (stars <= 1)
        risks.push('Low Timeform rating');

    return 0;
}

module.exports = function analyseForm(horse, race) {

    const reasons = [];
    const risks = [];

    const results = horse.past_results || [];

    let score = 0;

    score += scoreRecentResults(results, reasons, risks);
    score += scoreConsistency(results, reasons);
    score += scoreRecency(horse, reasons, risks);
    score += scoreRatings(results, reasons);
    score += scoreTimeform(horse, reasons, risks);

    // Normalise to the engine's 0–10 scale
    score = Math.max(0, Math.min(score, 10));

    return {
        score,
        reasons,
        risks
    };
};