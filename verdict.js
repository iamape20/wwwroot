'use strict';

module.exports = function verdict(confidence) {

    if (confidence >= 90)
        return 'Outstanding';

    if (confidence >= 80)
        return 'Strong Win Chance';

    if (confidence >= 70)
        return 'Good Chance';

    if (confidence >= 60)
        return 'Each Way';

    if (confidence >= 50)
        return 'Outside Chance';

    return 'Unlikely';

};