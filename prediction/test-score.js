const analyseRace = require("../analysis");
const calculateScore = require("./score");

const history = require("../../json/history/917502.json");

const today = {

    course: "Leopardstown",

    distance: "2m 4f",

    going: "Good",

    class: "Class 3",

    trainer: "Willie Mullins",

    jockey: "Paul Townend"

};

const analysis = analyseRace(today, history);

console.log("========== ANALYSIS ==========");
console.log(JSON.stringify(analysis, null, 2));

console.log();

console.log("========== SCORE ==========");
console.log(calculateScore(analysis));