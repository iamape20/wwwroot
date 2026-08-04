const json = require("./jsonService");
const { Redis } = require("@upstash/redis");
const { computeLiveMarketMove, overrideCategory, isNonRunner } = require("./liveScoring");

const redis = Redis.fromEnv();

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

	try {
		oddsHistory = await redis.get(`odds:${meetingId}:${index}`);
	} catch {
		oddsHistory = null;
	}

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
			runners: race.runners.map(runner => {

			const elite = ratingsRace
				? ratingsRace.runners.find(r =>
					String(r.id) === String(runner.id)
				)
				: null;

				if (!elite) {
					return {
						...runner,
						isNonRunner: oddsHistory ? isNonRunner(oddsHistory, runner.name) : false,
						elite: {
							rating: null,
							rank: null,
							confidence: null,
							checklistBreakdown: null,
							checklistPoints: null
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
							liveRating = recomputed.rating;
							liveBreakdown = recomputed.breakdown;
							livePoints = `${recomputed.earnedPoints}/${recomputed.maxPoints}`;
						}

					}

				}

				return {

					...runner,

					isNonRunner: oddsHistory ? isNonRunner(oddsHistory, runner.name) : false,

					elite: {
						rating: liveRating,
						rank: null,
						confidence: elite.confidence,
						checklistBreakdown: liveBreakdown,
						checklistPoints: livePoints
					}

				};

			})
        }

    };

}

module.exports = {
    getRace
};
