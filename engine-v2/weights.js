'use strict';

module.exports = {

    form: {

        momentum: 0.40,
        consistency: 0.30,
        win: 5,
        place: 2,
        strikeRate: 0.08,
        placeRate: 0.04,
        improving: 5,
        declining: -5,
        nonFinisher: -3,
        lastRunWin: 10

    },

	context: {

		freshRun: 2,

		idealRun: 4,

		neutralRun: 0,

		layoff: -2,

		longBreak: -5,

		courseWinner: 3,

		distanceWinner: 3,

		courseDistanceWinner: 5

	}

};