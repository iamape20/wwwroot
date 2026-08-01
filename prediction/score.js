module.exports = function calculateScore(analysis) {

    const factors = Object.values(analysis)
        .filter(f => f && typeof f.score === "number");

    if (factors.length === 0)
        return 0;

    const total = factors.reduce((sum, factor) => sum + factor.score, 0);

    return Math.round(total / factors.length);

};