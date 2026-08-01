// ============================================================================
// File: formTokenizer.js
// Description: Sporting Life Form Tokenizer
// ============================================================================

'use strict';

const MULTI_CHAR_TOKENS = [
    'DSQ',
    'PU',
    'UR',
    'BD',
    'RR',
    'RO',
    'BF',
    'CD'
];

function tokenizeForm(raw = '') {

    const tokens = [];

    let i = 0;

    while (i < raw.length) {

        const three = raw.substring(i, i + 3);
        const two = raw.substring(i, i + 2);

        if (MULTI_CHAR_TOKENS.includes(three)) {
            tokens.push(three);
            i += 3;
            continue;
        }

        if (MULTI_CHAR_TOKENS.includes(two)) {
            tokens.push(two);
            i += 2;
            continue;
        }

        tokens.push(raw[i]);
        i++;
    }

    return tokens;
}

module.exports = {
    tokenizeForm
};

// ============================================================================
// End of File
// ============================================================================