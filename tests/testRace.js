'use strict';

const cards = require('../../json/stage2_cards.json');
const predictRace = require('../prediction/race');

const meeting = Object.values(cards)[0];
const race = meeting.races[0];

const results = predictRace(race, meeting);

console.clear();

console.log('');
console.log(`${meeting.name} - ${meeting.date}`);
console.log(`Race Time : ${race.time}`);
console.log(`Distance  : ${race.distance}`);
console.log(`Going     : ${meeting.going}`);
console.log(`Class     : ${race.race_class}`);
console.log('='.repeat(70));

results.forEach((runner, index) => {

    console.log('');
    console.log(`${index + 1}. ${runner.horse}`);
    console.log('-'.repeat(70));

    console.log(
        `Overall Rating : ${runner.prediction.rating.toFixed(2)}`
    );

    console.log('');

    const analyses = runner.prediction.analyses;

    Object.entries(analyses).forEach(([name, result]) => {

        console.log(
            `${name.padEnd(12)} ${result.score}`
        );

    });

    console.log('');

    console.log('Reasons');

    let foundReason = false;

    Object.values(analyses).forEach(result => {

        result.reasons.forEach(reason => {

            console.log(`  ✓ ${reason}`);
            foundReason = true;

        });

    });

    if (!foundReason)
        console.log('  None');

    console.log('');

    console.log('Risks');

    let foundRisk = false;

    Object.values(analyses).forEach(result => {

        result.risks.forEach(risk => {

            console.log(`  • ${risk}`);
            foundRisk = true;

        });

    });

    if (!foundRisk)
        console.log('  None');

    console.log('');
    console.log('='.repeat(70));

});