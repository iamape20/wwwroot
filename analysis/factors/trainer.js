const groupedFactor = require("./groupedFactor");

module.exports = (today, history) =>
    groupedFactor(today, history, {
        section: "trainer",
        collection: "trainers",
        property: "trainer",
        value: today.trainer
    });