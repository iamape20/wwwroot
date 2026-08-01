const json = require("./jsonService");

function getRace(meetingId, raceIndex) {

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
	
    return {

        meeting: {
            id: meetingId,
            name: meeting.name,
            date: meeting.date,
            going: meeting.going
        },

        race: {
            index,
            time: race.time,
            distance: race.distance,
            class: race.race_class,
            verdict: race.verdict,
            bettingForecast: race.betting_forecast,
			runners: race.runners.map(runner => {

			const elite = ratingsRace
				? ratingsRace.runners.find(r =>
					String(r.id) === String(runner.id)
				)
				: null;

				return {

					...runner,

						elite: elite ? {
							rating: elite.power_rating,
							rank: null,
							confidence: elite.confidence,
							checklistBreakdown: elite.checklist_breakdown,
							checklistPoints: elite.checklist_points
						} : {
						rating: null,
						rank: null,
						confidence: null,
						checklistBreakdown: null,
						checklistPoints: null
					}

				};

			})
        }

    };

}

module.exports = {
    getRace
};