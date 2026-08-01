'use strict';

module.exports = function analyseMarket(horse) {

    const reasons = [];
    const risks = [];

    let score = 5;

    if (!horse.past_results || horse.past_results.length === 0) {
        risks.push('No market history');
        return { score, reasons, risks };
    }

    const runs = horse.past_results;

    // Position in betting market (1 = favourite)
    const favourites = runs.filter(r => Number(r.position_in_market) === 1);

    const favouriteWins = favourites.filter(r => Number(r.pos) === 1);

    if (favourites.length > 0) {

        reasons.push(
            `${favourites.length} time(s) favourite`
        );

        score += Math.min(favourites.length, 2);

        if (favouriteWins.length > 0) {

            reasons.push(
                `${favouriteWins.length} win(s) as favourite`
            );

            score += favouriteWins.length * 2;
        }

        const beatenFavs =
            favourites.length - favouriteWins.length;

        if (beatenFavs >= 3) {

            risks.push(
                `${beatenFavs} beaten favourite(s)`
            );

            score -= 2;
        }
    }

    score = Math.max(0, Math.min(score, 10));

    return {

        score,
        reasons,
        risks

    };

};