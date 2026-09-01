'use strict';
// engine-v2/contextEngine.js
//
// 2026-09-01: added trainer hot-form and jockeyOnDebutant, the two
// checklist categories validated via js/testIntentCategories.js on the
// real archive (not reconstruction - both need point-in-time data a
// horse's own past_results can't recover):
//   - trainer:          n=9,416, Yes 12.5% vs No 7.7% win rate, z=7.30,
//                        p~=0. The strongest validated-but-unused signal
//                        found in this project.
//   - jockeyOnDebutant:  n=614 debutant runners, 9.6% vs 2.3%, z=3.64,
//                        p=0.0003 (validated 2026-08-27, in checklistEngine.js).
// Both were checklist-only until now, and the checklist is a fallback
// tie-breaker only - this is the first time either has been able to
// affect what the site actually publishes.
//
// Logic mirrors checklistEngine.js's scoreTrainer/scoreJockeyOnDebutant
// exactly (same 14-day window, same 3-of-14 threshold, same debutant
// strike-rate threshold) rather than reinventing it - see that file for
// the original validation comments and the archive-derived threshold
// note on DEBUTANT_JOCKEY_STRIKE_RATE_THRESHOLD.
//
// Point budget: contextEngine already summed to a hard 100 cap (OR 30 +
// wins 20 + places 10 + avgFinish 20 + freshness 20). Rather than expand
// the ceiling and reopen the weight-tuning question, averageFinish
// (20->15) and freshness's top band (20->15) were trimmed to free 10
// points, split 7/3 by each signal's effect size (trainer's gap is much
// larger than jockeyOnDebutant's, and jockeyOnDebutant only ever applies
// to debutants, so it rarely competes with the trimmed categories anyway).
//
// NOT YET VALIDATED AT THE V2 LEVEL - the p-values above are checklist-
// level (per-runner win rate by answer). Whether this composite change
// actually improves V2's SELECTION (not just correlates with winning in
// isolation) needs a paired backtest before being trusted, same
// discipline as js/compareNormalization.js used for the normalization
// candidate. Do not treat this file alone as proof it helps.

// Same 14-day-window helper as checklistEngine.js's withinLastNDays -
// duplicated deliberately rather than shared, matching the established
// pattern for liveScoring.js/checklistEngine's parseFractionalOdds
// (confirmed character-for-character identical, no drift risk accepted
// as the tradeoff for not introducing a new shared-module dependency
// into engine-v2). If checklistEngine.js's version ever changes, this
// one must be updated to match.
function withinLastNDays(dateStr, days, asOfDate) {
    if (!dateStr) return false;
    const then = new Date(dateStr);
    if (isNaN(then.getTime())) return false;
    const ageDays = (asOfDate - then) / 86400000;
    return ageDays >= 0 && ageDays <= days;
}

// Mirrors checklistEngine.js's DEBUTANT_JOCKEY_STRIKE_RATE_THRESHOLD -
// the archive's own measured median at the time it was built (10.0%).
// Re-check against a growing archive periodically, same discipline as
// every other threshold in this project - keep this in sync with
// checklistEngine.js's copy if that one is ever re-derived.
const DEBUTANT_JOCKEY_STRIKE_RATE_THRESHOLD = 10.0;

// Trainer hot form: 3+ of the trainer's last 14 runners placed (top 3).
// Reads runner.trainer_data, attached by engine/raceEngine.js BEFORE
// predictor.predictRace() is called (moved there specifically so this
// data would be in scope here - previously only loaded after V2 ran,
// for the checklist call only).
function scoreTrainerFormContext(trainerData, asOfDate) {

    if (!trainerData?.recent_form?.length) return { points: 0, reason: null };

    const recentRuns = trainerData.recent_form.filter(r => withinLastNDays(r.date, 14, asOfDate));
    if (!recentRuns.length) return { points: 0, reason: null };

    const placedCount = recentRuns.filter(r => {
        const pos = Number(r.position);
        return pos >= 1 && pos <= 3;
    }).length;

    if (placedCount >= 3) {
        return { points: 7, reason: `Trainer hot form: ${placedCount}/${recentRuns.length} placed last 14 days` };
    }

    return { points: 0, reason: null };

}

// Debutant-specific jockey signal - for a genuine first-timer (zero
// past_results), asks whether the booked jockey is strong in general,
// independent of the horse's own (nonexistent) record. Reads
// runner.jockey_data, attached the same way as trainer_data above.
function scoreJockeyOnDebutantContext(runner, jockeyData) {

    if (!Array.isArray(runner.past_results) || runner.past_results.length !== 0)
        return { points: 0, reason: null };

    const strikeRate = jockeyData?.metrics?.overall?.strikeRate;
    if (typeof strikeRate !== "number") return { points: 0, reason: null };

    if (strikeRate >= DEBUTANT_JOCKEY_STRIKE_RATE_THRESHOLD) {
        return { points: 3, reason: `Debutant with ${strikeRate}% strike-rate jockey` };
    }

    return { points: 0, reason: null };

}

function analyse(runner, race) {

    const history = runner.history || {};

    let score = 0;
    const reasons = [];

    // Average OR
    if (history.averageOR >= 100) {
        score += 30;
        reasons.push(`Average OR ${history.averageOR}`);
    } else if (history.averageOR >= 90) {
        score += 20;
        reasons.push(`Average OR ${history.averageOR}`);
    } else if (history.averageOR >= 80) {
        score += 10;
        reasons.push(`Average OR ${history.averageOR}`);
    }

    // Wins
    if (history.wins) {
        const pts = Math.min(history.wins * 5, 20);
        score += pts;
        reasons.push(`${history.wins} win${history.wins === 1 ? '' : 's'}`);
    }

    // Places
    if (history.places) {
        const pts = Math.min(history.places * 2, 10);
        score += pts;
        reasons.push(`${history.places} place${history.places === 1 ? '' : 's'}`);
    }

    // Average finish - trimmed 20/10 -> 15/8 2026-09-01 to make room for
    // trainer/jockeyOnDebutant without raising the 100 cap.
    if (history.averageFinish > 0) {

        if (history.averageFinish <= 2) {
            score += 15;
            reasons.push(`Average finish ${history.averageFinish}`);
        }
        else if (history.averageFinish <= 3) {
            score += 8;
            reasons.push(`Average finish ${history.averageFinish}`);
        }

    }

    // Freshness - top band trimmed 20 -> 15 2026-09-01, same reason.
    if (typeof history.daysSinceRun === 'number') {

        if (history.daysSinceRun >= 7 &&
            history.daysSinceRun <= 45) {

            score += 15;

        } else {

            score += 10;

        }

        reasons.push(`Ran ${history.daysSinceRun} days ago`);
    }

    // ------------------------------------------------------------------
    // NEW 2026-09-01: trainer hot form + jockeyOnDebutant
    // ------------------------------------------------------------------

    // race.asOfDate is attached by engine/raceEngine.js (the meeting's own
    // date, anchoring every downstream calculation - see that file's
    // getHistoricalRuns comment). race itself carries no date field on
    // its own. Falling back to wall-clock "now" only happens if this is
    // ever called completely outside raceEngine.js's normal flow - worth
    // treating that as a red flag, not a safe default, since it would
    // silently mis-anchor the 14-day trainer-form window on any
    // historical/backtested race.
    const asOfDate = race?.asOfDate ? new Date(race.asOfDate) : new Date();

    const trainerForm = scoreTrainerFormContext(runner.trainer_data, asOfDate);
    if (trainerForm.points) {
        score += trainerForm.points;
        reasons.push(trainerForm.reason);
    }

    const jockeyOnDebutant = scoreJockeyOnDebutantContext(runner, runner.jockey_data);
    if (jockeyOnDebutant.points) {
        score += jockeyOnDebutant.points;
        reasons.push(jockeyOnDebutant.reason);
    }

    score = Math.min(score, 100);

    let confidence = 'Low';

    if (score >= 75)
        confidence = 'High';
    else if (score >= 50)
        confidence = 'Medium';

    return {

        engine: 'context',

        score,

        confidence,

        reasons,

        metrics: {

            averageOR: history.averageOR || 0,
            wins: history.wins || 0,
            places: history.places || 0,
            averageFinish: history.averageFinish || 0,
            daysSinceRun: history.daysSinceRun,
            trainerFormPoints: trainerForm.points,
            jockeyOnDebutantPoints: jockeyOnDebutant.points

        }

    };

}

module.exports = {
    analyse
};
