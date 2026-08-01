'use strict';

module.exports = function confidence(score) {

    return Math.max(
        0,
        Math.min(
            100,
            Math.round(score)
        )
    );

};