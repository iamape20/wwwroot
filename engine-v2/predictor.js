// ============================================================================
// File: backend/engine-v2/predictor.js
// Description: Race Predictor V2 Orchestrator
// Author: TVG TechBar / ChatGPT
// Version: 2.2.0
//
// Production change:
// - Composite scoring remains completely unchanged.
// - OR is used only as a deterministic tie-breaker.
// - A higher composite score ALWAYS beats a lower composite score.
// - When composite scores are equal, higher official rating wins.
// - No outcome/result information is used.
// ============================================================================

'use strict';

const formEngine = require('./formEngine');
const marketEngine = require('./marketEngine');
const verdictEngine = require('./verdictEngine');
const contextEngine = require('./contextEngine');
const scoreEngine = require('./scoreEngine');
const horseProfileEngine = require('../engine/horseProfileEngine');
const confidenceEngine = require('../engine/confidenceEngine');

// ============================================================================
// HELPERS
// ============================================================================

function getOfficialRating(runner) {

    const values = [
        runner?.or,
        runner?.OR,
        runner?.currentOR,
        runner?.officialRating,
        runner?.official_rating,
        runner?.entry?.officialRating,
        runner?.entry?.official_rating,
        runner?.entry?.bha
    ];

    for (const value of values) {

        if (
            value !== null &&
            value !== undefined &&
            value !== ''
        ) {

            const n = Number(value);

            if (Number.isFinite(n)) {
                return n;
            }
        }
    }

    return null;
}

// ============================================================================
// PRODUCTION SORT
// ============================================================================

function compareResults(a, b) {

    // ---------------------------------------------------------------
    // PRIMARY:
    // Existing production composite score.
    //
    // This is intentionally unchanged.
    // ---------------------------------------------------------------

    const scoreA = Number.isFinite(a.score)
        ? a.score
        : 0;

    const scoreB = Number.isFinite(b.score)
        ? b.score
        : 0;

    if (scoreB !== scoreA) {
        return scoreB - scoreA;
    }

    // ---------------------------------------------------------------
    // SECONDARY:
    // Official Rating only when composite scores are identical.
    //
    // Higher OR wins the tie.
    // ---------------------------------------------------------------

    const orA = getOfficialRating(a.runner);
    const orB = getOfficialRating(b.runner);

    if (orA !== null && orB !== null && orB !== orA) {
        return orB - orA;
    }

    // ---------------------------------------------------------------
    // FINAL:
    // Preserve original order when there is still a tie.
    // ---------------------------------------------------------------

    return a._productionIndex - b._productionIndex;
}

// ============================================================================
// MAIN PREDICTOR
// ============================================================================

function predictRace(race) {

    const results = [];

    for (let index = 0; index < race.runners.length; index++) {

        const runner = race.runners[index];

        // ---------------------------------------------------------------
        // Build horse profile before downstream engines.
        // ---------------------------------------------------------------

        runner.horse_profile =
            horseProfileEngine.build(runner);

        // ---------------------------------------------------------------
        // Existing engines.
        // ---------------------------------------------------------------

        const engines = {

            form:
                formEngine.analyse(
                    runner,
                    race
                ),

            context:
                contextEngine.analyse(
                    runner,
                    race
                ),

            market:
                marketEngine.analyse(
                    runner,
                    race
                ),

            verdict:
                verdictEngine.analyse(
                    runner,
                    race
                )

        };

        // ---------------------------------------------------------------
        // Existing composite scoring.
        // ---------------------------------------------------------------

        const composite =
            scoreEngine.calculate(
                engines
            );

        // ---------------------------------------------------------------
        // Existing confidence calculation.
        // ---------------------------------------------------------------

        const confidence =
            confidenceEngine.calculateConfidence(
                runner,
                race
            );

        results.push({

            runner,

            engines,

            score:
                composite.score,

            breakdown:
                composite.breakdown,

            confidence,

            // Internal deterministic ordering only.
            _productionIndex:
                index

        });
    }

    // ========================================================================
    // PRODUCTION RANKING
    // ========================================================================

    results.sort(compareResults);

    // Remove internal implementation field from returned objects.
    for (const result of results) {
        delete result._productionIndex;
    }

    return {

        winner:
            results[0],

        runners:
            results

    };

}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {

    predictRace

};

// ============================================================================
// End of File
// ============================================================================