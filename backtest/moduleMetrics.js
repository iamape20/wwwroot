'use strict';

module.exports = function calculateModuleMetrics(results) {

    const metrics = {};

    for (const race of results) {

        for (const prediction of race.predictions) {

            const analyses = prediction.prediction.analyses;

            for (const [name, analysis] of Object.entries(analyses)) {

                if (!metrics[name]) {

                    metrics[name] = {
                        races: 0,
                        totalScore: 0,
                        winners: 0
                    };

                }

                metrics[name].races++;
                metrics[name].totalScore += analysis.score;

                if (prediction.actualPosition === 1)
                    metrics[name].winners++;

            }

        }

    }

    const report = [];

    for (const [name, m] of Object.entries(metrics)) {

        report.push({

            module: name,

            averageScore:
                Number((m.totalScore / m.races).toFixed(2)),

            winnerRate:
                Number((m.winners / m.races * 100).toFixed(1))

        });

    }

    report.sort(
        (a, b) => b.winnerRate - a.winnerRate
    );

    return report;

};