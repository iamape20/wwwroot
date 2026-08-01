'use strict';

function rankRace(runners) {

    runners.sort((a, b) => b.rating - a.rating);

    runners.forEach((runner, index) => {

        runner.rank = index + 1;

    });

    return runners;

}

module.exports = rankRace;