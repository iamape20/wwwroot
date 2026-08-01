'use strict';

function validateRunner(runner) {

    if (!runner.id)
        throw new Error('Runner has no horse id');

    if (!runner.name)
        throw new Error('Runner has no horse name');

    if (!runner.trainer_id)
        throw new Error(`${runner.name} has no trainer id`);

    if (!runner.jockey_id)
        throw new Error(`${runner.name} has no jockey id`);

}

module.exports = {

    validateRunner

};