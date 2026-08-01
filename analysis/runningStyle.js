'use strict';

const STYLE_MAP = [
    {
        style: 'Front Runner',
        score: 10,
        patterns: [
            'made all',
            'soon led',
            'led after',
            'led',
            'with leader'
        ]
    },
    {
        style: 'Prominent',
        score: 8,
        patterns: [
            'chased leader',
            'tracked leader',
            'tracked leaders',
            'prominent',
            'close up',
            'pressed leader',
            'in touch'
        ]
    },
    {
        style: 'Midfield',
        score: 5,
        patterns: [
            'mid-division',
            'mid division',
            'midfield'
        ]
    },
    {
        style: 'Hold Up',
        score: 2,
        patterns: [
            'held up',
            'towards rear',
            'toward rear',
            'rear',
            'behind',
            'last pair',
            'last'
        ]
    }
];

function classify(description = '') {

    const text = description.toLowerCase();

    for (const style of STYLE_MAP) {

        if (style.patterns.some(p => text.includes(p))) {

            return {
                style: style.style,
                score: style.score
            };
        }
    }

    return {
        style: 'Unknown',
        score: 5
    };
}

module.exports = function analyseRunningStyle(horse) {

    const races = (horse.past_results || []).slice(0, 5);

    if (!races.length) {

        return {
            score: 5,
            style: 'Unknown',
            confidence: 0,
            breakdown: {},
            reasons: ['No previous runs'],
            risks: []
        };
    }

    const weights = [5,4,3,2,1];

    let totalScore = 0;
    let totalWeight = 0;

    const counts = {};

    for (let i = 0; i < races.length; i++) {

        const result = classify(races[i].ride_description);

        counts[result.style] = (counts[result.style] || 0) + 1;

        totalScore += result.score * weights[i];
        totalWeight += weights[i];
    }

    const score = Number((totalScore / totalWeight).toFixed(2));

    const style =
        Object.entries(counts)
            .sort((a,b)=>b[1]-a[1])[0][0];

    return {

        score,

        style,

        confidence: Math.min(100, races.length * 20),

        breakdown: counts,

        reasons: [
            `Usually races as a ${style}`
        ],

        risks: []

    };

};