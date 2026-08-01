'use strict';

const config = require('../config/pace.json');

module.exports = function calculatePace(predictions) {

    const pace = {
		
        expectedPace: 'Unknown',
        pressure: 0,

        styles: {
            frontRunner: { count: 0, horses: [] },
            prominent:   { count: 0, horses: [] },
            midfield:    { count: 0, horses: [] },
            holdUp:      { count: 0, horses: [] },
            unknown:     { count: 0, horses: [] }
        },

        summary: []
    };

    for (const prediction of predictions) {

        const style = prediction.analyses?.runningStyle?.style ?? 'Unknown';
        const horse = prediction.horse;

        switch (style) {

            case 'Front Runner':
                pace.styles.frontRunner.count++;
                pace.styles.frontRunner.horses.push(horse);
                break;

            case 'Prominent':
                pace.styles.prominent.count++;
                pace.styles.prominent.horses.push(horse);
                break;

            case 'Midfield':
                pace.styles.midfield.count++;
                pace.styles.midfield.horses.push(horse);
                break;

            case 'Hold Up':
                pace.styles.holdUp.count++;
                pace.styles.holdUp.horses.push(horse);
                break;

            default:
                pace.styles.unknown.count++;
                pace.styles.unknown.horses.push(horse);
        }
    }

	const weights = {
		frontRunner: config.weights?.frontRunner ?? 2,
		prominent: config.weights?.prominent ?? 1
	};

	pace.pressure =
		(pace.styles.frontRunner.count * weights.frontRunner) +
		(pace.styles.prominent.count * weights.prominent);

    if (pace.pressure >= config.pressure.veryStrong)
        pace.expectedPace = 'Very Strong';
    else if (pace.pressure >= config.pressure.strong)
        pace.expectedPace = 'Strong';
    else if (pace.pressure >= config.pressure.even)
        pace.expectedPace = 'Even';
    else
        pace.expectedPace = 'Slow';

    if (pace.styles.frontRunner.count >= 4)
        pace.summary.push('Several habitual front runners suggest a contested lead.');

    if (pace.styles.holdUp.count >= 4)
        pace.summary.push('There are several hold-up horses likely to finish late.');

    switch (pace.expectedPace) {
        case 'Very Strong':
            pace.summary.push('A very strong gallop is expected.');
            break;

        case 'Strong':
            pace.summary.push('A strong early pace is expected.');
            break;

        case 'Slow':
            pace.summary.push('A steadily run race looks likely.');
            break;
    }

    return pace;
};