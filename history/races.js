'use strict';

const history = require('../history');
const raceCache = new Map();

const races = new Map();

function registerRace(race) {
    races.set(race.id, race);
}

function getRace(id) {

    const race = races.get(id);

    if (!race)
        return null;

    return {
        ...race,
        runners: race.runnerIds
            .map(id => history.getHorse(id))
            .filter(Boolean)
    };
}

module.exports = {
    registerRace,
    getRace
};