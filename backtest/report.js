'use strict';

module.exports = function createReport(metrics) {

    console.log('');
    console.log('===============================');
    console.log(' Back-test Report');
    console.log('===============================');

    console.log(
        `Races analysed : ${metrics.races}`
    );

    console.log(
        `Winner accuracy: ${(metrics.winnerAccuracy * 100).toFixed(1)}%`
    );

    console.log(
        `Top-3 accuracy : ${(metrics.top3Accuracy * 100).toFixed(1)}%`
    );

    console.log('');

};