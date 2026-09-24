const json = require("./jsonService");
const { Redis } = require("@upstash/redis");
const { computeLiveMarketMove, overrideCategory, isNonRunner } = require("./liveScoring");

const redis = (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    ? Redis.fromEnv()
    : null;

async function getRace(meetingId, raceIndex) {

    const cards = json.load("stage2_cards.json");
	const ratings = json.load("final_ratings.json");
    const meeting = cards[meetingId];



    if (!meeting) {
        throw new Error("Meeting not found.");
    }

    const index = parseInt(raceIndex, 10);
	
    if (isNaN(index) || index < 0 || index >= meeting.races.length) {
        throw new Error("Race not found.");
    }

    const race = meeting.races[index];
	
	const ratingsMeeting = ratings[meetingId];

	const ratingsRace = ratingsMeeting
		? ratingsMeeting.races.find(r => r.time === race.time)
		: null;

	// Fetch this race's odds history ONCE, not once per runner - keeps
	// this to a single Redis call regardless of field size. Silently
	// falls back to the static, once-a-day ratings if Redis is
	// unreachable or misconfigured - live re-scoring is an enrichment,
	// not something that should ever break the page if it fails.
	let oddsHistory = null;

	if (redis) {
		try {
			oddsHistory = await redis.get(`odds:${meetingId}:${index}`);
		} catch {
			oddsHistory = null;
		}
	}

    // officialPickId is the id of the FIRST runner in ratingsRace.runners's
    // own, unmodified order - i.e. the real, override-adjusted pick (same one
    // api/checkResults.js's results tracker uses via predRace.runners[0]).
    // The returned runners list below stays in whatever order it is in -
    // the frontend does its own rating-based sort for DISPLAY - so this flag
    // is how a lower-rated "our pick" still gets identified correctly even
    // when it is not first in the list shown to the user.
    const officialPickId = ratingsRace?.runners?.[0]?.id ?? null;

    return {

        meeting: {
            id: meetingId,
            name: meeting.name,
            date: meeting.date,
            going: meeting.going
        },

        race: {
            index,
            title: race.display_title || "Race",
            time: race.time,
            distance: race.distance,
            class: race.race_class,
            verdict: race.verdict,
            bettingForecast: race.betting_forecast,
            drawAdvantage: ratingsRace?.draw_advantage || "None",
			// Iterates ratingsRace.runners (final_ratings.json) when available,
			// NOT race.runners (stage2_cards.json) - the stage2_cards order is
			// just whatever the scraper produced, with no relationship to our
			// own pick. ratingsRace.runners is raceEngine.js's real output
			// order, INCLUDING the market-override rule (shipped 2026-09-17)
			// that moves the market favourite to first place when it differs
			// from the model's own top rating - the exact same order
			// api/checkResults.js's results-tracking strip reads via
			// predRace.runners[0]. Previously this mapped over race.runners
			// and only used ratingsRace as a per-runner lookup, discarding its
			// order entirely - dashboard.js then had to reconstruct SOME order
			// itself client-side (sorting by elite.rating), silently
			// disagreeing with the results tracker on which horse was
			// actually "our pick" for the same race. Falls back to
			// race.runners's own order only when no ratings exist yet for
			// this race (elite stays null throughout, matching the
			// pre-existing no-ratings-yet behaviour).
			runners: (ratingsRace ? ratingsRace.runners : race.runners).map(orderedEntry => {

			const runner = ratingsRace
				? (race.runners.find(r => String(r.id) === String(orderedEntry.id)) || orderedEntry)
				: orderedEntry;

			const elite = ratingsRace ? orderedEntry : null;

			const isOurPick = officialPickId != null && String(runner.id) === String(officialPickId);

				if (!elite) {
					return {
						...runner,
						isNonRunner: oddsHistory ? isNonRunner(oddsHistory, runner.name) : false,
						isOurPick,
						elite: {
							rating: null,
							confidence: null,
							checklistBreakdown: null,
							checklistPoints: null,
							engineDetails: null
						}
					};
				}

				// Start with the static, once-a-day values - this is
				// what gets returned if there's no fresher live signal
				let liveRating = elite.power_rating;
				let liveBreakdown = elite.checklist_breakdown;
				let livePoints = elite.checklist_points;

				if (oddsHistory) {

					const liveMove = computeLiveMarketMove(oddsHistory, runner.name);

					if (liveMove) {

						const recomputed = overrideCategory(elite.checklist_breakdown, "marketMove", liveMove);

						if (recomputed) {
							// IMPORTANT:
							// recomputed.rating is a CHECKLIST rating.
							// Do not replace the production V2 power_rating with it.
							//
							// The production ELITE rating must remain the V2 rating.
							liveBreakdown = recomputed.breakdown;
							livePoints =
								`${recomputed.earnedPoints}/${recomputed.maxPoints}`;
						}
					}

				}

				return {

					...runner,

					isNonRunner: oddsHistory ? isNonRunner(oddsHistory, runner.name) : false,

					isOurPick,

					elite: {
						rating: liveRating,
						confidence: elite.confidence,
						checklistBreakdown: liveBreakdown,
						checklistPoints: livePoints,
						engineDetails: elite.engine_details
					}

				};

			})
        }

    };

}

module.exports = {
    getRace
};
