'use strict';

const cards = require('./data/stage2_cards.json');

const predictor = require('./engine-v2/predictor');

for (const meetingId of Object.keys(cards)) {

    const meeting = cards[meetingId];

    console.log("\n==================================================");
    console.log(meeting.course || meeting.track || meetingId);
    console.log("==================================================");

    for (const race of meeting.races) {

        console.log(`\nRace ${race.time}`);

        const prediction = predictor.predictRace(race);

        console.table(

            prediction.runners.map(r => ({

                Horse: r.runner.name,

                Score: r.score,

                Form: r.engines.form.score,

                Market: r.engines.market.score,

                Verdict: r.engines.verdict.score

            }))

        );

        console.log("Winner:", prediction.winner.runner.name);

    }

}