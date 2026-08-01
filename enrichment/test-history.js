const buildHistory = require("./history");

const horse =
    require("../../json/horses/917502.json");

const history = buildHistory(horse);

console.log(
    JSON.stringify(
        history.summary.distance,
        null,
        2
    )
);