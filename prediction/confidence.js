'use strict';

module.exports = function calculateConfidence(horse, analyses) {

    let confidence = 100;

    const results = horse.past_results || [];

    //
    // Limited race history
    //

    if (results.length < 5)
        confidence -= 20;

    //
    // Missing trainer information
    //

    if (
        analyses.trainer &&
        analyses.trainer.risks.includes('Trainer statistics unavailable')
    ) {
        confidence -= 10;
    }

    //
    // Unknown course experience
    //

    if (
        analyses.course &&
        analyses.course.risks.includes('No previous runs at this course')
    ) {
        confidence -= 5;
    }

    //
    // Missing Timeform
    //

    if (!horse.timeform_info)
        confidence -= 5;

    confidence = Math.max(0, Math.min(confidence, 100));

    return confidence;

};