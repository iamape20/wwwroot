'use strict';

const path = require('path');

module.exports = {

    version: '1.0.0',

    paths: {

        cards: path.join(__dirname, '..', 'json', 'stage2_cards.json'),

        history: path.join(__dirname, '..', 'json', 'stage3_horses.json'),

        output: path.join(__dirname, '..', 'json', 'final_ratings.json'),

        logs: path.join(__dirname, '..', 'logs')

    },

    prediction: {

        topSelections: 3,

        minimumConfidence: 50

    },

    logging: {

        enabled: true,

        level: 'info'

    }

};