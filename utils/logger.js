'use strict';

const DEBUG = false;

module.exports = {
    log(...args) {
        if (DEBUG) {
            console.log(...args);
        }
    }
};