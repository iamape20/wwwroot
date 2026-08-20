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
	let raceCardDate = null;
	
	for (const meeting of Object.values(daily || {})) {
		
		const date =
			meeting?.meeting_summary?.date;

		if (date) {
			raceCardDate = date;
			break;
		}

	}

    meetings = Object.keys(cards).length;

    const raceTimes = [];

    for (const meeting of Object.values(cards)) {

        races += meeting.races.length;

        for (const race of meeting.races) {
            runners += race.runners.length;

            raceTimes.push({
                course: meeting.name,
                time: race.time
            });
        }
    }

	const ratingRaces = Array.isArray(ratings)
		? ratings
		: Object.values(ratings);

	for (const [meetingId, meeting] of Object.entries(ratings)) {

		if (!Array.isArray(meeting.races))
			continue;

		meeting.races.forEach((race, raceIndex) => {

			if (!Array.isArray(race.runners))
				return;

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
						silkUrl: runner.silk_url,
						meetingId,
						raceIndex

					};
				}

			}

		});

	}

    // ------------------------------------------------------------
    // TODAY'S STRONG CANDIDATES
    // ------------------------------------------------------------
    //
    // Presentation data only.
    // Does not alter ratings or production selections.
    // ------------------------------------------------------------

    const strongCandidates = [];

    for (const [meetingId, meeting] of Object.entries(ratings || {})) {

        if (!Array.isArray(meeting.races))
            continue;

        meeting.races.forEach((race, raceIndex) => {

            if (!Array.isArray(race.runners))
                return;

            const runners =
                race.runners
                    .filter(r =>
                        r &&
                        r.isNonRunner !== true
                    )
                    .slice()
                    .sort((a, b) =>
                        (Number(b.power_rating) || 0) -
                        (Number(a.power_rating) || 0)
                    );

            if (runners.length < 2)
                return;

            const top = runners[0];
            const second = runners[1];

            const rating =
                Number(top.power_rating);

            const secondRating =
                Number(second.power_rating);

            if (
                !Number.isFinite(rating) ||
                !Number.isFinite(secondRating)
            )
                return;

            const gap =
                Number(
                    (rating - secondRating)
                        .toFixed(1)
                );

            // Initial research/display threshold.
            // Experiment 2 may refine this later.
            if (gap < 10)
                return;

            strongCandidates.push({

                horse: top.name,

                rating,

                gap,

                confidence:
                    Number(top.confidence) || null,

                course:
                    meeting.name,

                raceTime:
                    race.time,

                meetingId,

                raceIndex,

                tier:
                    top.tier ||
                    race.tier ||
                    null,

                silkUrl:
                    top.silk_url || null

            });

        });

    }

    strongCandidates.sort((a, b) =>
        b.gap - a.gap ||
        b.rating - a.rating
    );
	





    return {

        success: true,

        dashboard: {

            daily,
            nap,
            bestOpportunity,
			strongCandidates,
            raceTimes,
			raceCardDate,

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