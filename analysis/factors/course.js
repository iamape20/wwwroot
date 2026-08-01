const groupedFactor = require("./groupedFactor");

module.exports = function analyseCourse(today, history) {

    return groupedFactor(today, history, {

        section: "course",

        collection: "courses",

        property: "course",

        value: today.course

    });

};