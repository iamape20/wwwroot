'use strict';

/**
 * ============================================================================
 * TVG Racing Engine
 * Anomaly Engine
 * ----------------------------------------------------------------------------
 * Evaluates race-wide risk and produces the engine strategy verdict.
 * ============================================================================
 */

function analyseRace({

    race,
    meeting,
    libraries,

    reasons,

    totalRunners,

    avgTop4Sample,

    rawGap,

    topPick

}) {

    const going =
        (meeting.going || "").toLowerCase();

    // -------------------------
    // Automatic reasons
    // -------------------------

    if (avgTop4Sample < 2.5)
        reasons.push("INSUFFICIENT DATA VOLUME");

    if (
        going.includes("heavy") ||
        going.includes("soft")
    ) {
        reasons.push(`${meeting.going} Ground`);
    }

    const venueKey =
        meeting.name.toUpperCase().trim();

    const distKey =
        race.standard_distance ||
        race.distance.split(" ")[0];

    const venueBias =
        libraries.drawBias?.[venueKey];

    if (
        venueBias &&
        venueBias[distKey] &&
        venueBias[distKey].preferred !== "neutral"
    ) {

        reasons.push(
            `${venueBias[distKey].preferred.toUpperCase()} Draw Bias`
        );

    }

    // -------------------------
    // Determine RAG level
    // -------------------------

    let level = "GREEN";
    let reason = "Stable Data Profile";

    const majorRisk =
        (
            going.includes("heavy") ||
            going.includes("soft")
        ) &&
        totalRunners > 12;

    if (
        reasons.length >= 4 ||
        majorRisk
    ) {

        level = "RED";

        reason =
            `CRITICAL: ${reasons.join(" + ")}`;

    }
    else if (reasons.length >= 2) {

        level = "AMBER";

        reason =
            `CAUTION: ${reasons.join(" + ")}`;

    }
    else if (reasons.length === 1) {

        level = "GREEN";

        reason =
            `MINIMAL VARIANCE: ${reasons[0]}`;

    }

    // -------------------------
    // Betting strategy
    // -------------------------

    const second =
        race.runners[1];

    const tested =
        race.runners.filter(r =>
            r.cross_verification &&
            r.cross_verification.status !== "UNTESTED"
        );

    const blindSpot =
        (tested.length / totalRunners) < 0.30;

    const hurdle =
        blindSpot
            ? 15
            : 4;

    let verdict;

    if (level === "RED") {

        verdict =
            "PASS";

    }
    else if (rawGap >= hurdle) {

        verdict =
            `BET ${topPick.name}`;

    }
    else {

        verdict =
            "PASS";

    }

    return {

        anomaly: {

            level,

            reason

        },

        strategy: {

            hurdle,

            rawGap,

            verdict

        }

    };

}

module.exports = {

    analyseRace

};