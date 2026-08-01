'use strict';

module.exports = function printModuleReport(report) {

    console.log('');
    console.log('========================================');
    console.log(' Module Performance');
    console.log('========================================');

    for (const row of report) {

        console.log(
            row.module.padEnd(15) +
            row.averageScore.toFixed(2).padStart(8) +
            row.winnerRate.toFixed(1).padStart(10) + '%'
        );

    }

    console.log('');

};