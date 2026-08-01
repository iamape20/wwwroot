'use strict';

/**
 * ============================================================================
 * TVG Racing Engine
 * Rating Engine
 * ----------------------------------------------------------------------------
 * Calculates the runner's final Power Rating.
 * Behaviour matches the existing a1ratings.js implementation.
 * ============================================================================
 */

function calculatePowerRating({

    rawAnchorScore = 0,
    suit = { bonus: 0 },
    drawBonus = 0,
    trainerWinRate = 0,
    jockeyWinRate = 0,
    trainerElite = false,
    jockeyElite = false,
    daysSinceRun = 999,
    lastRunWasWin = false,
    isTrueDebutant = false,
    isUnexposed = false,
    weightLbs = 140,
    isFirstTimeGear = false
}) {

    let score = rawAnchorScore;

    // Course / distance suitability
    score += suit.bonus || 0;

    // Draw bias
    score += drawBonus;

    // Jockey
    score += jockeyElite
        ? 5
        : (jockeyWinRate * 0.10);

    // Trainer
    score += trainerElite
        ? 5
        : (trainerWinRate * 0.30);

    // Elite combination
    if (trainerElite && jockeyElite)
        score += 4;

    // Quick turnaround
    if (daysSinceRun <= 2 && !jockeyElite)
        score -= 4;

    // Last-time-out winner
    if (lastRunWasWin && !isTrueDebutant) {

        score += 5;

        if (isUnexposed)
            score += 4;

    }

    // Big weight
    if (weightLbs > 150)
        score -= 3;

    // First-time headgear
    if (isFirstTimeGear)
        score += 3;

    return Math.round(score * 10) / 10;

}

module.exports = {

    calculatePowerRating

};