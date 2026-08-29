'use strict';

// Positive phrases confirmed to genuinely repeat in real archived
// verdict text (2026-08-28, 40-sample scan) - not invented.
const POSITIVE_PHRASES = [
    'taken to',
    'the one to beat',
    'hard to oppose',
    'can follow up',
    'should prove difficult to beat',
    'expected to go well',
    'holds strong claims',
    'sets the standard',
    'gets the vote',
    'gets the nod',
    'gets the verdict',
    'stands out',
    'open his account',
    'open her account',
    'get off the mark',
    'gets off the mark',
    'unlucky',
    'fancied to',
    'can build on',
    'good record in this',
    'well capable of readying',
    'well forward',
    'well-connected',
    'winning newcomer',
    'winning newcomers',
    'premium yearling',
    'expensive purchase'
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

// Splits verdict text into sentences, so phrase matches can be scoped
// to the sentence actually naming a given horse instead of the whole
// paragraph. Real archived verdicts are consistently structured this
// way - one clause for the top pick, one for the main danger, etc
// (confirmed 2026-08-28 against 40 real samples) - so this is a
// grounded structural assumption, not a guess.
//
// FOUND 2026-08-28: every phrase match previously applied to the
// WHOLE verdict text, uniformly, for every runner in the race - which
// mathematically cannot change who's rated highest, since a uniform
// bonus cancels out in any relative comparison. This is the actual
// fix for that - only the sentence(s) mentioning THIS horse count
// toward THIS horse's phrase-based score.
function splitSentences(text) {
    return (text || '')
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0);
}

function analyse(runner, race) {

    const fullText = normalise(race.verdict || '');
    const name = normalise(runner.name);

    const sentences = splitSentences(race.verdict || '');
    const ownSentences = sentences.filter(s => normalise(s).includes(name));

    // Fall back to the whole text only if no sentence could be
    // matched to this horse specifically (e.g. name appears only in
    // the trailing name-list, not in a real sentence) - preserves
    // existing behaviour for that edge case rather than silently
    // losing a legitimate signal.
    const scopedText = ownSentences.length
        ? normalise(ownSentences.join(' '))
        : fullText;

    let score = 40;
    const reasons = [];

    const mentioned = fullText.includes(name);

    if (mentioned) {
        score += 20;
        reasons.push('Mentioned in analyst verdict');
    }

    for (const phrase of POSITIVE_PHRASES) {
        if (scopedText.includes(normalise(phrase))) {
            score += 5;
            reasons.push(`Positive: ${phrase}`);
        }
    }

    for (const phrase of NEGATIVE_PHRASES) {
        if (scopedText.includes(normalise(phrase))) {
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
            mentioned
        }
    };
}

module.exports = {
    analyse
};
