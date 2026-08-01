'use strict';

module.exports = [
    {
        name: 'form',
        analyse: require('./form')
    },
    {
        name: 'going',
        analyse: require('./going')
    },
    {
        name: 'distance',
        analyse: require('./distance')
    },
    {
        name: 'class',
        analyse: require('./class')
    },
    {
        name: 'ratings',
        analyse: require('./ratings')
    },
    {
        name: 'course',
        analyse: require('./course')
    },
    {
        name: 'market',
        analyse: require('./market')
    },
    {
        name: 'consistency',
        analyse: require('./consistency')
    },
    {
        name: 'trainer',
        analyse: require('./trainer')
    },
    {
        name: 'jockey',
        analyse: require('./jockey')
    },
	{
		name: "runningStyle",
		analyse: require("./runningStyle")
	},
    {
        name: 'raceContext',
        analyse: require('./raceContext')
    }
];