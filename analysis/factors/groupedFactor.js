
const analyseFactor = require("../helpers/analyseFactor");

module.exports = function groupedFactor(
    today,
    history,
    {
        section,
        collection,
        property,
        value
    }
) {


    return analyseFactor({

        todayValue: value,

        records: history.summary[section][collection],

        property,

        label: section

    });

};