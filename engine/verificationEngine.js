'use strict';

/**
 * ============================================================================
 * TVG Racing Engine
 * Verification Engine
 * ----------------------------------------------------------------------------
 * Historical binary verification.
 * ============================================================================
 */

const { parseToPounds } = require('./weight');

function calculateBinaryYield(targetMask, history, isTopRated = false) {

    if (!history || !Array.isArray(history))
        return {
            rate: 0,
            sample: 0,
            status: "UNTESTED"
        };

    if (!targetMask || targetMask.length < 8)
        return {
            rate: 0,
            sample: 0,
            status: "UNTESTED"
        };

    let weightedOccurrences = 0;
    let weightedSuccess = 0;

    const targetC1 = targetMask[0];
    const targetC2 = targetMask[1];
    const targetC4 = targetMask[3];
    const targetC6 = isTopRated ? "1" : "0";

    for (let i = 0; i < history.length; i++) {

        const run = history[i];

        const weight = parseToPounds(run.weight);

        const odds = run.odds
            ? parseFloat(run.odds)
            : 99;

        let days = 25;

        if (
            history[i + 1] &&
            run.date &&
            history[i + 1].date
        ) {

            const d1 = new Date(run.date);
            const d2 = new Date(history[i + 1].date);

            if (!isNaN(d1) && !isNaN(d2)) {

                days = Math.ceil(
                    (d1 - d2) /
                    (1000 * 60 * 60 * 24)
                );

                if (days < 0)
                    days = 25;

            }

        }

        const c1 =
            (String(run.pos) === "1" || odds <= 4)
                ? "1"
                : "0";

        const c2 =
            weight <= 148
                ? "1"
                : "0";

        const c4 =
            days <= 45
                ? "1"
                : "0";

        const c6 =
            (
                String(run.pos) === "1" ||
                String(run.pos) === "2"
            )
                ? "1"
                : "0";

        let matches = 0;

        if (c1 === targetC1) matches++;
        if (c2 === targetC2) matches++;
        if (c4 === targetC4) matches++;

        if (targetC6 === "1" && c6 === "1")
            matches++;

        let weighting = 0;

        if (matches >= 3)
            weighting = matches === 4 ? 1 : 0.5;

        if (!weighting)
            continue;

        weightedOccurrences += weighting;

        const finish =
            String(run.pos || run.position);

        if (["1", "2", "3"].includes(finish))
            weightedSuccess += weighting;

    }

    if (!weightedOccurrences)
        return {
            rate: 0,
            sample: 0,
            status: "UNTESTED"
        };

    const rate = Math.round(
        (weightedSuccess / weightedOccurrences) * 100
    );

    const sample = Math.round(weightedOccurrences);

    let status = "SPECULATIVE";

    if (sample >= 12) {

        if (rate >= 38)
            status = "MATHEMATICALLY_VERIFIED";

        else if (rate < 18)
            status = "HISTORICAL_TRAP";

    }
    else if (sample >= 3) {

        if (rate >= 50)
            status = "VERIFIED_OVERLAY (LOW VOL)";

        else if (rate < 20)
            status = "HISTORICAL_TRAP (LOW VOL)";

    }
    else {

        status = "UNTESTED";

    }

    return {

        rate,

        sample,

        status

    };

}

module.exports = {

    calculateBinaryYield

};