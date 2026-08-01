module.exports = function analyseFactor({
    todayValue,
    records,
    property,
    label
}) {

const record = records.find(
    item => item[property] === todayValue
);

    if (!record) {

        return {
            matched: false,
            score: 50,
            confidence: 25,
            reason:
                `No previous ${label} record`,
            statistics: null

        };

    }

    let score = 50;

    score += Math.min(record.runs * 2, 10);
    score += record.win_rate * 0.30;
    score += record.place_rate * 0.20;

    score = Math.min(100, Math.round(score));

return {
    matched: true,
    score,
    confidence: 75,
    reason:
        `${record.runs} run${record.runs === 1 ? "" : "s"} with ${record.wins} win${record.wins === 1 ? "" : "s"} and ${record.places} place${record.places === 1 ? "" : "s"}.`,
    statistics: record
};

};