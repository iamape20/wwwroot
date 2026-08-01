'use strict';

/**
 * Parses Sporting Life betting forecast.
 *
 * Example:
 *
 * Connecteo (4/1), Millhone (9/2), Point Cartwright (5/1)
 */

function extractMarket(forecast) {

    if (!forecast) {
        return {
            ranking: [],
            prices: {},
            favourite: null
        };
    }

    const regex = /([^,(]+?)\s*\(([^)]+)\)/g;

    const ranking = [];
    const prices = {};

    let match;

    while ((match = regex.exec(forecast)) !== null) {

        const horse = match[1]
            .trim()
            .toUpperCase();

        const odds = match[2].trim();

        ranking.push(horse);

        prices[horse] = odds;

    }

    return {

        ranking,

        prices,

        favourite: ranking.length ? ranking[0] : null

    };

}

function enrichMarket(race) {

    race.market = extractMarket(
        race.betting_forecast || ''
    );

    return race;

}

module.exports = {

    enrichMarket

};