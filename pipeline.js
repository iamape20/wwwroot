'use strict';

const processRace = require('./race');

const logger = require('./logger');
const stats = require('./stats');

function processMeetings(meetings) {

    const results = [];

    for (const meetingId of Object.keys(meetings)) {

        const meeting = meetings[meetingId];

        stats.meetings++;

        logger.info(`Meeting: ${meeting.name}`);

        for (const race of meeting.races) {

            try {

                const result = processRace(meeting, race);

                results.push(result);

            }
            catch (err) {

                stats.errors++;

			logger.error(`${meeting.name} ${race.time}`);
				console.error(err.stack);

            }

        }

    }

    return results;

}

module.exports = processMeetings;