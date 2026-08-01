'use strict';

/**
 * ============================================================================
 * TVG Racing Engine
 * Score Engine
 * ----------------------------------------------------------------------------
 * Calculates the 11-point strategy checklist exactly as implemented in
 * a1ratings.js.
 * ============================================================================
 */

function calculateScore({

    isTrueDebutant = false,
    lastClass = 5,
    todayClass = 5,
    lastRunWasWin = false,

    suit = {},

    hasDistanceWin = false,
    hasDistancePlace = false,

    passRecentForm = false,
    passSpeedTarget = false,

    hasGoingWin = false,
    hasGoingPlace = false,

    drawBonus = 0,

    daysSinceRun = 999,

    isFirstTimeGear = false,

    hasJockeyPrevBond = false,

    trainerPlaces = 0

}) {

    const classScore =
        (!isTrueDebutant && lastClass <= todayClass)
            ? (lastRunWasWin ? 3 : 2)
            : 0;

    const courseScore =
        suit.is_cd_winner
            ? 3
            : (suit.bonus > 0 ? 2 : 0);

    const distanceScore =
        hasDistanceWin
            ? 3
            : (hasDistancePlace ? 1 : 0);

    const formScore =
        passRecentForm ? 2 : 0;

    const speedScore =
        passSpeedTarget ? 2 : 0;

    const goingScore =
        hasGoingWin
            ? 2
            : (hasGoingPlace ? 1 : 0);

    const drawScore =
        drawBonus < 0 ? 0 : 1;

    const fitnessScore =
        daysSinceRun <= 50 ? 1 : 0;

    const aidsScore =
        isFirstTimeGear ? 0 : 1;

    const jockeyScore =
        hasJockeyPrevBond ? 1 : 0;

    const trainerScore =
        trainerPlaces >= 3 ? 1 : 0;

    const checkList = [

        { label: "Class", value: classScore, pass: classScore > 0 },

        { label: "Course", value: courseScore, pass: courseScore > 0 },

        { label: "Distance", value: distanceScore, pass: distanceScore > 0 },

        { label: "Recent Form", value: formScore, pass: formScore > 0 },

        { label: "Speed", value: speedScore, pass: speedScore > 0 },

        { label: "Going", value: goingScore, pass: goingScore > 0 },

        { label: "Draw", value: drawScore, pass: drawScore > 0 },

        { label: "Fitness", value: fitnessScore, pass: fitnessScore > 0 },

        { label: "Aids", value: aidsScore, pass: aidsScore > 0 },

        { label: "Jockey", value: jockeyScore, pass: jockeyScore > 0 },

        { label: "Trainer", value: trainerScore, pass: trainerScore > 0 }

    ];

    const rawScore =
        classScore +
        courseScore +
        distanceScore +
        formScore +
        speedScore +
        goingScore +
        drawScore +
        fitnessScore +
        aidsScore +
        jockeyScore +
        trainerScore;

    return {

        classScore,
        courseScore,
        distanceScore,
        formScore,
        speedScore,
        goingScore,
        drawScore,
        fitnessScore,
        aidsScore,
        jockeyScore,
        trainerScore,

        rawScore,

        strategyRating: rawScore * 5,

        passed:

            checkList.filter(c => c.pass).length,

        checkList

    };

}

module.exports = {

    calculateScore

};