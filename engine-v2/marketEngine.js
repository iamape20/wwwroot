// ============================================================================
// File: backend/engine-v2/marketEngine.js
// Description: Market Engine - analyses enriched market data.
// Author: TVG TechBar / ChatGPT
// Version: 2.1.0
// ============================================================================

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

function analyse(runner, race) {

    const market = race.market || {};

    const ranking = market.ranking || [];
    const prices = market.prices || {};

    const name = normalise(runner.name);

    const rank = ranking.indexOf(name);

    if (rank === -1) {

        return {
            engine: 'market',
            score: 40,
            confidence: 'Low',
            reasons: [
                'Horse not found in market ranking'
            ],
            metrics: {}
        };

    }

    const score = MARKET_SCORES[rank + 1] || 40;

    return {

        engine: 'market',

        score,

        confidence: rank < 3 ? 'High' : 'Medium',

        reasons: [
            `Market Rank ${rank + 1}`,
            `Odds ${prices[name] || 'Unknown'}`
        ],

        metrics: {
            rank: rank + 1,
            odds: prices[name] || null,
            favourite: market.favourite === name
        }

    };

}

module.exports = {
    analyse
};