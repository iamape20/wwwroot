'use strict';

const fs = require('fs');
const path = require('path');

const history = require('./history');
const predictRace = require('./prediction/racePredictor');

const racesFolder = path.join(__dirname, '..', 'json', 'races');

if (!fs.existsSync(racesFolder)) {
    console.error('Race folder not found.');
    process.exit(1);
}

const raceFiles = fs.readdirSync(racesFolder)
    .filter(file => file.endsWith('.json'))
    .sort();

if (raceFiles.length === 0) {
    console.error('No races found.');
    process.exit(1);
}

console.log('========================================');
console.log(' Horse Racing Prediction Engine');
console.log('========================================');
console.log('');

let totalRaces = 0;
let totalPredictions = 0;
const results = [];


for (const file of raceFiles) {

    const raceId = path.parse(file).name;

    const race = history.getRace(raceId);

    if (!race)
        continue;

    const runners = race.runnerIds
        .map(id => history.getHorse(id))
        .filter(Boolean);

    if (runners.length === 0) {
        console.log(`${race.course} ${race.time ?? ''} - No runners`);
        continue;
    }

    const predictions = predictRace(runners, race);
	
	results.push({
		id: race.id,
		course: race.course,
		time: race.time,
		winner: predictions[0] || null,
		predictions
	});
	
    totalRaces++;
    totalPredictions += predictions.length;

    console.log(`${race.time ?? '--:--'} ${race.course}`);
    console.table(
        predictions.map(p => ({
            Rank: p.rank,
            Horse: p.horse,
            Rating: p.rating.toFixed(2),
            Confidence: `${p.confidence}%`
        }))
    );

    console.log('');
}

const predictionFolder = path.join(__dirname, '..', 'json', 'predictions');

fs.mkdirSync(predictionFolder, { recursive: true });

const today = new Date().toISOString().substring(0, 10);

const outputFile = path.join(
    predictionFolder,
    `${today}.json`
);

fs.writeFileSync(
    outputFile,
    JSON.stringify({
        generated: new Date().toISOString(),
        races: results
    }, null, 2),
    'utf8'
);

console.log(`Predictions saved to ${outputFile}`);
console.log('');

console.log('========================================');
console.log(`Races Predicted : ${totalRaces}`);
console.log(`Total Horses    : ${totalPredictions}`);
console.log('========================================');