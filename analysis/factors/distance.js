const groupedFactor = require("./groupedFactor");

module.exports = function analyseDistance(today, history) {
    return groupedFactor(today, history, {
        section: "distance",
        collection: "distances",
        property: "distance",
        value: today.distance
    });
};