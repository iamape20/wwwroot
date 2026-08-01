'use strict';

const fs = require('fs');
const path = require('path');

const horseCache = new Map();
const trainerCache = new Map();
const jockeyCache = new Map();
const raceCache = new Map();

function loadJson(folder, id, cache) {

    if (id === undefined || id === null)
        return null;

    id = String(id);

    if (cache.has(id))
        return cache.get(id);

    const file = path.join(
        __dirname,
        '..',
        'json',
        folder,
        `${id}.json`
    );

    if (!fs.existsSync(file)) {
        cache.set(id, null);
        return null;
    }

    try {

        const data = JSON.parse(
            fs.readFileSync(file, 'utf8')
        );

        cache.set(id, data);

        return data;

    }
    catch (err) {

        console.error(`Unable to load ${file}`);

        cache.set(id, null);

        return null;
    }
}

function getHorse(id) {
    return loadJson('horses', id, horseCache);
}

function getTrainer(id) {
    return loadJson('trainers', id, trainerCache);
}

function getJockey(id) {
    return loadJson('jockeys', id, jockeyCache);
}

function getRace(id) {
    return loadJson('races', id, raceCache);
}

function getHorseHistory(id) {
    return getHorse(id);
}

module.exports = {
    getHorse,
    getHorseHistory,
    getTrainer,
    getJockey,
    getRace
};