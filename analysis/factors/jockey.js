const groupedFactor = require("./groupedFactor");

module.exports = (today, history) =>
    groupedFactor(today, history, {
        section: "jockey",
        collection: "jockeys",
        property: "jockey",
        value: today.jockey
    });