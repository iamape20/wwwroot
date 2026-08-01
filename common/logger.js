// ============================================================================
// File: backend/common/logger.js
// Description: Shared logging utility.
// Author: TVG TechBar / ChatGPT
// Version: 1.0.0
// ============================================================================

'use strict';

// ============================================================================
// Private Functions
// ============================================================================

function timestamp() {

    return new Date().toISOString();

}

function write(level, message) {

    console.log(
        `[${timestamp()}] [${level}] ${message}`
    );

}

// ============================================================================
// Public Functions
// ============================================================================

function info(message) {

    write('INFO', message);

}

function warn(message) {

    write('WARN', message);

}

function error(message) {

    write('ERROR', message);

}

function success(message) {

    write('PASS', message);

}

// ============================================================================
// Exports
// ============================================================================

module.exports = {

    info,
    warn,
    error,
    success

};

// ============================================================================
// End of File
// ============================================================================