const groupedFactor = require("./groupedFactor");

module.exports = (today, history) =>
    groupedFactor(today, history, {
        section: "class",
        collection: "classes",
        property: "class",
        value: today.class
    });