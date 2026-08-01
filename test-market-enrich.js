'use strict';

const cards = require('./data/stage2_cards.json');

const {
    enrichMarket
} = require('./scraper/enrich/market');

for (const meetingId of Object.keys(cards)) {

    const meeting = cards[meetingId];

    for (const race of meeting.races) {

        if (race.time === '19:18') {

            enrichMarket(race);

            console.dir(
                race.market,
                { depth: null }
            );

        }

    }

}