const groupedFactor = require("./groupedFactor");

module.exports = function analyseGoing(today, history) {
    return groupedFactor(today, history, {
        section: "going",
        collection: "conditions",
        property: "going",
        value: today.going
    });
};