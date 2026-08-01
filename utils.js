'use strict';

function safeNumber(value, fallback = 0) {

    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;

}

function clamp(value, min, max) {

    return Math.min(
        Math.max(value, min),
        max
    );

}

module.exports = {

    safeNumber,
    clamp

};