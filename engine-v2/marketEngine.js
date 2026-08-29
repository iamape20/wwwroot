'use strict';

const config = require('./config');

const MARKET_SCORES = config.marketScores;

function normalise(text) {
    return (text || '')
        .toUpperCase()
        .replace(/\(.*?\)/g, '')
        .replace(/[^A-Z0-9 ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function fractionalToDecimal(value) {

    if (value === null || value === undefined) {
        return null;
    }

    const text = String(value).trim().toUpperCase();

    if (!text) {
        return null;
    }

    if (text === 'EVS' || text === 'EVENS' || text === 'EVEN') {
        return 2;
    }

    const match = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);

    if (match) {
        const numerator = Number(match[1]);
        const denominator = Number(match[2]);

        if (denominator > 0) {
            return 1 + (numerator / denominator);
        }
    }

    const decimal = Number(text);

    if (Number.isFinite(decimal) && decimal > 1) {
        return decimal;
    }

    return null;
}

function analyse(runner, race) {

    const runners = Array.isArray(race?.runners)
        ? race.runners.filter(r => !r.non_runner)
        : [];

    const pricedRunners = runners
        .map(r => ({
            runner: r,
            name: normalise(r.name),
            odds: r.current_odds,
            decimal: fractionalToDecimal(r.current_odds)
        }))
        .filter(x => x.decimal !== null)
        .sort((a, b) => a.decimal - b.decimal);

    const name = normalise(runner.name);

    const rankedIndex = pricedRunners.findIndex(
        x => x.name === name
    );

    if (rankedIndex === -1) {

        return {
            engine: 'market',
            score: 40,
            confidence: 'Low',
            reasons: [
                'No usable current odds'
            ],
            metrics: {
                odds: runner.current_odds || null,
                rank: null,
                runners_with_prices: pricedRunners.length
            }
        };

    }

    const rank = rankedIndex + 1;

    const score =
        MARKET_SCORES[rank] ??
        MARKET_SCORES[10] ??
        40;

    const favourite = rank === 1;
    const odds = pricedRunners[rankedIndex].odds;

    let confidence = 'Medium';

    if (rank <= 3) {
        confidence = 'High';
    }

    const reasons = [
        `Market Rank ${rank}`,
        `Odds ${odds}`
    ];

    if (favourite) {
        reasons.push('Current favourite');
    }

    return {

        engine: 'market',

        score,

        confidence,

        reasons,

        metrics: {
            rank,
            odds,
            decimal_odds: pricedRunners[rankedIndex].decimal,
            favourite,
            runners_with_prices: pricedRunners.length
        }

    };

}

module.exports = {
    analyse,
    fractionalToDecimal
};
