'use strict';

/*
===============================================================================
 EPR MARKET INTELLIGENCE ENGINE
===============================================================================

Purpose
-------
Production intelligence layer derived from the historical EPR market
disagreement analysis.

IMPORTANT
---------
This engine DOES NOT alter:

    - power_rating
    - EPR ranking
    - checklist scoring
    - confidence calculation
    - vulnerability calculation

It provides a separate market-awareness layer.

Historical validation showed:

    EPR #1 = market favourite
        -> strong EPR performance

    EPR #1 != market favourite
        -> EPR performance falls sharply

Therefore the market is treated as a CONFIRMATION / WARNING signal,
not as an EPR scoring component.

===============================================================================
*/

const CONFIG = Object.freeze({

    // Favourite must be identifiable from production odds.
    minimumFieldSize: 2,

    // Rating gap between EPR #1 and market favourite.
    nearGap: 3,
    moderateGap: 10,

    // EPR rank of market favourite.
    nearRank: 2,
    disagreementRank: 3
});


/*
===============================================================================
 BASIC HELPERS
===============================================================================
*/

function number(value) {

    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : null;
}


function normaliseName(value) {

    return String(value ?? '')
        .trim()
        .toUpperCase();
}


function horseName(runner) {

    return (
        runner?.name ??
        runner?.horseName ??
        runner?.entry?.horseName ??
        runner?.id ??
        ''
    );
}


function horseKey(runner) {

    return normaliseName(horseName(runner));
}


function eprRating(runner) {

    return number(
        runner?.power_rating ??
        runner?.powerRating ??
        runner?.rating
    );
}


/*
===============================================================================
 MARKET ODDS
===============================================================================

Production final_ratings normally exposes current_odds / odds.

We deliberately use the CURRENT production market information only.

Lowest valid decimal price = market favourite.

We do not fabricate a favourite when no usable market price exists.
===============================================================================
*/

function marketOdds(runner) {

    const candidates = [
        runner?.current_odds,
        runner?.odds,
        runner?.currentOdds,
        runner?.starting_price
    ];

    for (const value of candidates) {

        if (value === null || value === undefined) {
            continue;
        }

        // Already numeric = assume decimal odds.
        if (typeof value === 'number') {

            if (
                Number.isFinite(value) &&
                value > 0
            ) {
                return value;
            }

            continue;
        }

        const text =
            String(value).trim();

        // ------------------------------------------------------------
        // Fractional odds
        //
        // Examples:
        // 4/5  -> 1.8 decimal
        // 6/1  -> 7.0 decimal
        // 11/2 -> 6.5 decimal
        // ------------------------------------------------------------

        const fractional =
            text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);

        if (fractional) {

            const numerator =
                Number(fractional[1]);

            const denominator =
                Number(fractional[2]);

            if (
                Number.isFinite(numerator) &&
                Number.isFinite(denominator) &&
                denominator > 0
            ) {

                return Number(
                    (
                        1 +
                        numerator / denominator
                    ).toFixed(4)
                );
            }

            continue;
        }

        // ------------------------------------------------------------
        // Decimal odds
        // ------------------------------------------------------------

        const decimal =
            Number(
                text.replace(/[^0-9.]/g, '')
            );

        if (
            Number.isFinite(decimal) &&
            decimal > 0
        ) {
            return decimal;
        }
    }

    return null;
}

/*
===============================================================================
 FIND MARKET FAVOURITE
===============================================================================
*/

function findMarketFavourite(runners) {

    const candidates =
        runners
            .map((runner, index) => ({
                runner,
                index,
                odds: marketOdds(runner)
            }))
            .filter(x =>
                x.odds !== null
            )
            .sort((a, b) => {

                if (a.odds !== b.odds) {
                    return a.odds - b.odds;
                }

                return a.index - b.index;
            });

    if (!candidates.length) {
        return null;
    }

    return candidates[0];
}


/*
===============================================================================
 EPR ORDER
===============================================================================
*/

function rankByEpr(runners) {

    return runners
        .map((runner, index) => ({
            runner,
            index,
            rating: eprRating(runner)
        }))
        .filter(x =>
            x.rating !== null
        )
        .sort((a, b) => {

            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }

            return a.index - b.index;
        });
}


/*
===============================================================================
 ANALYSE RACE
===============================================================================
*/

function analyseRace(runners) {

    if (!Array.isArray(runners)) {

        return {
            available: false,
            status: 'NO_DATA'
        };
    }


    const usable =
        runners.filter(r =>
            r &&
            r.isNonRunner !== true &&
            eprRating(r) !== null
        );


    if (
        usable.length <
        CONFIG.minimumFieldSize
    ) {

        return {
            available: false,
            status: 'INSUFFICIENT_FIELD'
        };
    }


    const eprRanked =
        rankByEpr(usable);


    if (!eprRanked.length) {

        return {
            available: false,
            status: 'NO_EPR_DATA'
        };
    }


    const eprTop =
        eprRanked[0];


    const marketFavourite =
        findMarketFavourite(usable);


    if (!marketFavourite) {

        return {
            available: false,
            status: 'NO_MARKET_DATA',

            epr: {
                rank: 1,
                horse: horseName(eprTop.runner),
                rating: eprTop.rating
            }
        };
    }


    const favourite =
        marketFavourite.runner;


    const favouriteKey =
        horseKey(favourite);


    const favouriteRankIndex =
        eprRanked.findIndex(
            x =>
                horseKey(x.runner) ===
                favouriteKey
        );


    const favouriteRank =
        favouriteRankIndex >= 0
            ? favouriteRankIndex + 1
            : null;


    const favouriteRating =
        eprRating(favourite);


    const gap =
        favouriteRating !== null
            ? Number(
                (
                    eprTop.rating -
                    favouriteRating
                ).toFixed(1)
            )
            : null;


    /*
    ---------------------------------------------------------------------------
    CLASSIFICATION
    ---------------------------------------------------------------------------
    */

    let status;
    let level;
    let label;
    let reason;


    if (
        favouriteKey ===
        horseKey(eprTop.runner)
    ) {

        status = 'AGREEMENT';
        level = 'POSITIVE';
        label = 'MARKET CONFIRMED';
        reason =
            'EPR #1 is also the market favourite.';

    }

    else if (
        favouriteRank === CONFIG.nearRank
    ) {

        status = 'NEAR_CONFLICT';
        level = 'CAUTION';
        label = 'MARKET ALERT';
        reason =
            'Market favourite is EPR #2.';

    }

    else {

        status = 'DISAGREEMENT';
        level = 'WARNING';
        label = 'MARKET WARNING';
        reason =
            'Market favourite ranks below EPR #2.';
    }


    /*
    ---------------------------------------------------------------------------
    GAP STRENGTH
    ---------------------------------------------------------------------------
    */

    let gapLevel = 'UNKNOWN';

    if (gap !== null) {

        if (
            Math.abs(gap) <
            CONFIG.nearGap
        ) {

            gapLevel = 'CLOSE';

        }

        else if (
            Math.abs(gap) <
            CONFIG.moderateGap
        ) {

            gapLevel = 'MODERATE';

        }

        else {

            gapLevel = 'LARGE';
        }
    }


    /*
    ---------------------------------------------------------------------------
    EXTREME DISAGREEMENT
    ---------------------------------------------------------------------------
    */

    const extremeDisagreement =
        status === 'DISAGREEMENT' &&
        favouriteRank >= CONFIG.disagreementRank &&
        gap !== null &&
        gap >= CONFIG.moderateGap;


    if (extremeDisagreement) {

        level = 'STRONG_WARNING';
        label = 'STRONG MARKET WARNING';

        reason =
            'Market favourite is ranked EPR #3+ and is materially below EPR #1.';
    }


    /*
    ---------------------------------------------------------------------------
    MARKET STRENGTH
    ---------------------------------------------------------------------------
    */

    let marketStrength = 'UNKNOWN';

    if (
        marketFavourite.odds !== null
    ) {

        const odds =
            marketFavourite.odds;

        if (odds <= 2.5) {
            marketStrength = 'STRONG';
        }

        else if (odds <= 5) {
            marketStrength = 'MEDIUM';
        }

        else {
            marketStrength = 'WEAK';
        }
    }


    return {

        available: true,

        status,
        level,
        label,
        reason,

        gapLevel,
        extremeDisagreement,

        epr: {

            rank: 1,

            horse:
                horseName(eprTop.runner),

            rating:
                eprTop.rating
        },

        market: {

            favourite:
                horseName(favourite),

            odds:
                marketFavourite.odds,

            eprRank:
                favouriteRank,

            eprRating:
                favouriteRating,

            eprGap:
                gap,

            strength:
                marketStrength
        }
    };
}


/*
===============================================================================
 APPLY TO RACE
===============================================================================
*/

function applyMarketIntelligence(race) {

    if (!race) {
        return race;
    }


    const runners =
        Array.isArray(race.runners)
            ? race.runners
            : [];


    const marketIntelligence =
        analyseRace(runners);


    return {

        ...race,

        market_intelligence:
            marketIntelligence
    };
}


/*
===============================================================================
 APPLY TO COMPLETE RATINGS OBJECT
===============================================================================
*/

function enrichRatings(ratings) {

    if (!ratings || typeof ratings !== 'object') {
        return ratings;
    }


    const output = {};


    for (
        const [meetingId, meeting]
        of Object.entries(ratings)
    ) {

        if (
            !meeting ||
            !Array.isArray(meeting.races)
        ) {

            output[meetingId] =
                meeting;

            continue;
        }


        output[meetingId] = {

            ...meeting,

            races:
                meeting.races.map(
                    applyMarketIntelligence
                )
        };
    }


    return output;
}


/*
===============================================================================
 EXPORTS
===============================================================================
*/

module.exports = {

    CONFIG,

    marketOdds,
    findMarketFavourite,
    rankByEpr,

    analyseRace,
    applyMarketIntelligence,
    enrichRatings
};