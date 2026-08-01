module.exports = function scoreFactor(record) {

    if (!record) {
        return {
            score: 50,
            confidence: 0,
            reliability: 0
        };
    }

    const runs = record.runs || 0;
    const winRate = record.win_rate || 0;
    const placeRate = record.place_rate || 0;

    // Overall suitability
    const score = Math.min(
        100,
        Math.round((winRate * 0.7) + (placeRate * 0.3))
    );

    // Amount of evidence
    const confidence = Math.min(
        100,
        runs * 10
    );

    // Reliability of the evidence
    const reliability = Math.min(
        100,
        Math.round((runs / 20) * 100)
    );

    return {
        score,
        confidence,
        reliability
    };
};