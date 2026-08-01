const weights = require('../engine-v2/weights');

console.assert(weights.form.win > 0);
console.assert(weights.form.consistency > 0);
console.assert(weights.context.courseWinner > 0);

console.log('Weights OK');