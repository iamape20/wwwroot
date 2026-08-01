const json = require("./jsonService");

function getDashboard() {

    const daily = json.load("daily_data.json");
    const ratings = json.load("final_ratings.json");
    const nap = json.load("nap_spotlight.json");
    const cards = json.load("stage2_cards.json");

    let meetings = 0;
    let races = 0;
    let runners = 0;

    let bestOpportunity = null;

    meetings = Object.keys(cards).length;

    for (const meeting of Object.values(cards)) {

        races += meeting.races.length;

        for (const race of meeting.races) {
            runners += race.runners.length;
        }
    }

	const ratingRaces = Array.isArray(ratings)
		? ratings
		: Object.values(ratings);

	for (const meeting of Object.values(ratings)) {

		if (!Array.isArray(meeting.races))
			continue;

		for (const race of meeting.races) {

			if (!Array.isArray(race.runners))
				continue;

			for (const runner of race.runners) {

				if (
					!bestOpportunity ||
					runner.power_rating > bestOpportunity.rating
				) {

					bestOpportunity = {

						horse: runner.name,
						rating: runner.power_rating,
						confidence: runner.confidence,
						course: meeting.name,
						raceTime: race.time,
						silkUrl: runner.silk_url

					};
				}

			}

		}

	}

    return {

        success: true,

        dashboard: {

            daily,
            nap,
            bestOpportunity,

            statistics: {

                meetings,
                races,
                runners

            }

        }

    };

}

module.exports = {

    getDashboard

};
