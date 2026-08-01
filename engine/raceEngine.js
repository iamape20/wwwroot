'use strict';
// ./engine/raceEngine.js

const fs = require("fs");
const path = require("path");
const predictor = require("../engine-v2/predictor");
const formProfileEngine = require("../formProfileEngine");

const HORSE_DIR = path.join(__dirname, "..", "json", "horses");

function loadHorseJson(id) {

    const file = path.join(HORSE_DIR, `${id}.json`);

    if (!fs.existsSync(file)) return null;

    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
        return null;
    }

}

function computeDaysSinceRun(dateStr) {

    if (!dateStr) return null;

    const then = new Date(dateStr);
    if (isNaN(then.getTime())) return null;

    const now = new Date();
    return Math.round((now - then) / 86400000);

}

async function analyseRace(meeting) {

    for (const race of meeting.races) {

        for (const runner of race.runners) {

            runner.form = formProfileEngine.build(runner);

            const horseData = loadHorseJson(runner.id);

            if (horseData?.last_run_date) {
                runner.days_since_run = computeDaysSinceRun(horseData.last_run_date);
            }

        }

        const prediction = predictor.predictRace(race);

        // predictor.predictRace() already runs horseProfileEngine internally
        // (wired in via predictor.js), so runner.horse_profile is populated
        // as a side effect here — no separate call needed.

        for (const result of prediction.runners) {

            result.runner.power_rating = result.score;
            result.runner.confidence = result.confidence.score;
            result.runner.confidence_grade = result.confidence.grade;
            result.runner.rating_breakdown = result.breakdown;
            result.runner.engine_details = result.engines;

        }

        race.runners.sort(
            (a, b) => (b.power_rating || 0) - (a.power_rating || 0)
        );

    }

    return meeting;
}

module.exports = {
    analyseRace
};
