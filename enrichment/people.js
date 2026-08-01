'use strict';

module.exports = function enrichPeople(horse) {

    if (!horse)
        return horse;

    //
    // Trainer
    //

    if (typeof horse.trainer === 'string') {

        horse.trainer = {
            name: horse.trainer,
            strikeRate14: null,
            strikeRate30: null,
            courseWins: null
        };

    }

    //
    // Jockey
    //

    if (typeof horse.jockey === 'string') {

        horse.jockey = {
            name: horse.jockey,
            strikeRate14: null,
            strikeRate30: null,
            partnershipStrikeRate: null
        };

    }

    return horse;

};