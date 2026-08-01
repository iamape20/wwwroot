'use strict';

const POSITIVE_PHRASES = [
    'taken to',
    'the one to beat',
    'hard to oppose',
    'can follow up',
    'should prove difficult to beat',
    'expected to go well',
    'holds strong claims',
    'sets the standard'
];

const NEGATIVE_PHRASES = [
    'others preferred',
    'best watched',
    'hard to recommend',
    'needs more',
    'up against it'
];

function normalise(text) {
    return (text || '')
        .toUpperCase()
        .replace(/\(.*?\)/g, '')
        .replace(/[^A-Z0-9 ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function analyse(runner, race) {

    const text = normalise(race.verdict || '');
    const name = normalise(runner.name);

    let score = 40;
    const reasons = [];

    if (text.includes(name)) {
        score += 20;
        reasons.push('Mentioned in analyst verdict');
    }

    for (const phrase of POSITIVE_PHRASES) {
        if (text.includes(normalise(phrase))) {
            score += 5;
            reasons.push(`Positive: ${phrase}`);
        }
    }

    for (const phrase of NEGATIVE_PHRASES) {
        if (text.includes(normalise(phrase))) {
            score -= 5;
            reasons.push(`Negative: ${phrase}`);
        }
    }

    score = Math.max(0, Math.min(100, score));

    return {
        engine: 'verdict',
        score,
        confidence: score >= 70 ? 'High' : score >= 50 ? 'Medium' : 'Low',
        reasons,
        metrics: {
            mentioned: text.includes(name)
        }
    };
}

module.exports = {
    analyse
};