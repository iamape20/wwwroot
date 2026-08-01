'use strict';

const cards = require('./data/stage2_cards.json');

const { enrichVerdict } =
    require('./scraper/enrich/verdict');

for (const meetingId of Object.keys(cards)) {

    const meeting = cards[meetingId];

    for (const race of meeting.races) {

        if (race.time === '19:18') {

            enrichVerdict(race);

            console.log(race.analysis);

        }

    }

}