'use strict';

const analyseRace = require('../analysis');

const conditionsModel = require('./models/conditions');
const connectionsModel = require('./models/connections');

const history = require('../../json/history/917502.json');

const today = {

    course: 'Leopardstown',

    distance: '2m 4f',

    going: 'Good',

    class: 1,

    trainer: 'J P Ryan',

    jockey: 'Daniel King'

};

const analysis = analyseRace(today, history);

console.log('Conditions');
console.log(conditionsModel(analysis));

console.log();

console.log('Connections');
console.log(connectionsModel(analysis));