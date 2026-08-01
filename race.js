'use strict';

const predictHorse = require('./prediction');
const rankRace = require('./prediction/ranking');
const { getHorseHistory } = require('./history');
const { validateRunner } = require('./validator');
const logger = require('./logger');
const stats = require('./stats');
const { getTrainer } = require('./history');
const { getJockey } = require('./history');

function processRace(meeting, race) {

   // logger.info(`${meeting.name} ${race.time}`);

    const predictions = [];

    for (const runner of race.runners) {

        validateRunner(runner);

		const history = getHorseHistory(runner.id);
		const trainer = getTrainer(runner.trainer_id);
		const jockey = getJockey(runner.jockey_id);

		const horse = {
			...runner,
			...(history || {}),
			trainer,
			jockey,
			course: meeting.name,
			course_code: meeting.course_shortcode || meeting.courseCode,
			meetingDate: meeting.date,
			going: meeting.going,
			raceTime: race.time,
			distance: race.distance,
			shortDistance: race.dist,
			raceClass: race.race_class
		};

		const context = {
			race: {
				course: meeting.name,
				date: meeting.date,
				going: meeting.going,
				time: race.time,
				distance: race.distance,
				shortDistance: race.dist,
				raceClass: race.race_class,
				runners: race.runners.length,
				handicap: race.handicap,
				surface: race.surface,
				type: race.type
			},
			history
		};

		const prediction = predictHorse(horse, context);

        predictions.push(prediction);

        stats.runners++;
        stats.predicted++;

    }

    const ranked = rankRace(predictions);

    stats.races++;

    return {
        course: meeting.name,
        date: meeting.date,
        going: meeting.going,
        raceTime: race.time,
        distance: race.distance,
        raceClass: race.race_class,
        runners: ranked
    };

}

module.exports = processRace;