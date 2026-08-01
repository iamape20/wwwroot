// confidenceEngine.js

function calculateConfidence(runner, race) {

    const breakdown = {};
    const reasons = [];
	const WEIGHTS = {
		verificationSample: 30,
		verificationRate: 20,
		runningStyle: 15,
		pace: 10,
		experience: 10,
		fitness: 5,
		strategy: 10
	};
    // ----------------------------------------------------
    // 1. Verification Sample (30)
    // ----------------------------------------------------

    const sample = runner.cross_verification?.sample || 0;

    let sampleScore = 0;

    if (sample >= 50) sampleScore = 30;
    else if (sample >= 20) sampleScore = 25;
    else if (sample >= 10) sampleScore = 20;
    else if (sample >= 5) sampleScore = 10;
    else if (sample >= 1) sampleScore = 5;

    breakdown.verification_sample = sampleScore;

    if (sample >= 20)
        reasons.push("Large historical sample");

    // ----------------------------------------------------
    // 2. Verification Rate (20)
    // ----------------------------------------------------

    const rate =
        runner.cross_verification?.rate || 0;

    const verificationScore =
        Math.round(rate / 5);

    breakdown.verification_rate =
        verificationScore;

    if (rate >= 90)
        reasons.push("Excellent historical strike rate");

    // ----------------------------------------------------
    // 3. Running Style Confidence (15)
    // ----------------------------------------------------

    const styleConfidence =
        runner.horse_profile?.running_style_confidence || 0;

    breakdown.running_style =
        Math.round((styleConfidence / 100) * 15);

    if (styleConfidence >= 80)
        reasons.push("Consistent running style");

    // ----------------------------------------------------
    // 4. Pace Advantage (10)
    // ----------------------------------------------------

    const pace =
        runner.pace_profile?.pace_advantage || "";

    let paceScore = 5;

    switch (pace) {

        case "Strong Advantage":
            paceScore = 10;
            break;

        case "Advantage":
            paceScore = 8;
            break;

        case "Neutral":
            paceScore = 5;
            break;

        case "Disadvantage":
            paceScore = 2;
            break;

    }

    breakdown.pace = paceScore;

    if (paceScore >= 8)
        reasons.push("Positive pace setup");

    // ----------------------------------------------------
    // 5. Experience (10)
    // ----------------------------------------------------

    const runs =
        runner.form?.runs || runner.past_results?.length || 0;

    let experience = 0;

    if (runs >= 20) experience = 10;
    else if (runs >= 10) experience = 8;
    else if (runs >= 4) experience = 6;
    else if (runs >= 1) experience = 3;

    breakdown.experience =
        experience;

    // ----------------------------------------------------
    // 6. Fitness (5)
    // ----------------------------------------------------

    const days =
        runner.days_since_run || 999;

    let fitness = 0;

    if (days >= 14 && days <= 60)
        fitness = 5;

    else if (days <= 120)
        fitness = 3;

    else if (days <= 365)
        fitness = 1;

    breakdown.fitness = fitness;

    // ----------------------------------------------------
    // 7. Strategy (10)
    // ----------------------------------------------------

    const passed =
        runner.strategy?.passed || 0;

    breakdown.strategy =
        Math.round((passed / 11) * 10);

    // ----------------------------------------------------
    // Total
    // ----------------------------------------------------

    const score =
        Object.values(breakdown)
            .reduce((a, b) => a + b, 0);

    let grade = "SPECULATIVE";
    let level = 1;

    if (score >= 95) {
        grade = "ELITE";
        level = 6;
    }
    else if (score >= 90) {
        grade = "VERY HIGH";
        level = 5;
    }
    else if (score >= 80) {
        grade = "HIGH";
        level = 4;
    }
    else if (score >= 70) {
        grade = "GOOD";
        level = 3;
    }
    else if (score >= 60) {
        grade = "FAIR";
        level = 2;
    }

    return {

        score,

        level,

        grade,

        breakdown,

        reasons

    };

}

module.exports = {

    calculateConfidence

};