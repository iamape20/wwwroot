'use strict';

/**
 * Extract analyst selections from the end of a Sporting Life verdict.
 *
 * Example:
 *
 * "... CONNECTEO (IRE) MILLHONE (IRE) POINT CARTWRIGHT (IRE)"
 */

function extractSelections(verdict) {

    if (!verdict)
        return [];

    const regex = /([A-Z][A-Z' -]+?)\s*\((?:IRE|GB|FR|USA|GER)\)/g;

    const selections = [];

    let match;

    while ((match = regex.exec(verdict)) !== null) {

        selections.push(
            match[1]
                .trim()
                .replace(/\s+/g, ' ')
        );

    }

    return [...new Set(selections)];

}

function extractMentions(verdict, runners) {

    const text = (verdict || '').toUpperCase();

    return runners
        .map(r => r.name.toUpperCase())
        .filter(name => text.includes(name));

}

function enrichVerdict(race) {

    race.analysis = race.analysis || {};

    race.analysis.selections =
        extractSelections(race.verdict);

    race.analysis.mentions =
        extractMentions(race.verdict, race.runners);

    return race;

}

module.exports = {

    enrichVerdict

};