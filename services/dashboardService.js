const json = require("./jsonService");

// ============================================================================
// Dashboard candidate classification
// ============================================================================
//
// Strong Candidates:
//   EPR >= 75 AND confidence >= 70
//
// Worth Considering:
//   EPR >= 70 AND confidence >= 45
//
// Anything below those thresholds remains out of the positive betting lists.
//
// IMPORTANT:
//   These classifications are presentation/selection layers only.
//   They do NOT alter the V2 power rating or confidence calculation.
// ============================================================================

function classifyCandidate(horse) {

    const power = Number(horse?.power_rating ?? 0);
    const confidence = Number(horse?.confidence ?? 0);

    if (power >= 75 && confidence >= 70) {

        return {
            tier: "Strong",
            label: "STRONG CANDIDATE"
        };

    }

    if (power >= 70 && confidence >= 45) {

        return {
            tier: "Worth Considering",
            label: "WORTH CONSIDERING"
        };

    }

    return {
        tier: null,
        label: null
    };
}


// ============================================================================
// DASHBOARD
// ============================================================================

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


    // ========================================================================
    // RACE CARD DATE
    // ========================================================================

    for (const meeting of Object.values(daily || {})) {

        const date =
            meeting?.meeting_summary?.date;

        if (date) {

            raceCardDate = date;
            break;

        }

    }


    // ========================================================================
    // BASIC CARD STATISTICS
    // ========================================================================

    meetings =
        Object.keys(cards || {}).length;

    const raceTimes = [];


    for (const meeting of Object.values(cards || {})) {

        if (!Array.isArray(meeting.races))
            continue;


        races += meeting.races.length;


        for (const race of meeting.races) {

            if (!Array.isArray(race.runners))
                continue;


            runners += race.runners.length;


            raceTimes.push({

                course: meeting.name,
                time: race.time

            });

        }

    }


    // ========================================================================
    // BEST OPPORTUNITY
    // ========================================================================
    //
    // This remains the highest EPR-rated runner on the card.
    //
    // Informational only.
    //
    // It does NOT mean the horse is automatically a Strong Candidate.
    //
    // ========================================================================

    for (
        const [meetingId, meeting]
        of Object.entries(ratings || {})
    ) {

        if (!Array.isArray(meeting.races))
            continue;


        meeting.races.forEach((race, raceIndex) => {

            if (!Array.isArray(race.runners))
                return;


            for (const runner of race.runners) {

                const rating =
                    Number(runner?.power_rating);


                if (!Number.isFinite(rating))
                    continue;


                if (
                    !bestOpportunity ||
                    rating > bestOpportunity.rating
                ) {

                    bestOpportunity = {

                        horse:
                            runner.name,

                        rating,

                        confidence:
                            Number.isFinite(
                                Number(runner.confidence)
                            )
                                ? Number(runner.confidence)
                                : null,

                        course:
                            meeting.name,

                        raceTime:
                            race.time,

                        silkUrl:
                            runner.silk_url || null,

                        meetingId,

                        raceIndex

                    };

                }

            }

        });

    }


    // ========================================================================
    // TODAY'S BETTING CANDIDATES
    // ========================================================================
    //
    // IMPORTANT:
    //
    // The production ratings are stored in `ratings`.
    //
    // Do NOT use `meetings` here.
    //
    // `meetings` is a numeric statistic containing the number of meetings.
    //
    // `ratings` contains the actual final_ratings.json data.
    //
    // ========================================================================

    const strongCandidates = [];
    const worthConsidering = [];


    for (const meeting of Object.values(ratings || {})) {

        if (!Array.isArray(meeting.races))
            continue;


        for (const race of meeting.races) {

            if (!Array.isArray(race.runners))
                continue;


            for (const horse of race.runners) {

                const classification =
                    classifyCandidate(horse);


                // ------------------------------------------------------------
                // Not sufficiently strong for either positive category.
                // ------------------------------------------------------------

                if (!classification.tier)
                    continue;


                const candidate = {

                    meeting:
                        meeting.name,

                    race:
                        race.time,

                    name:
                        horse.name,

                    id:
                        horse.id,

                    power_rating:
                        Number(
                            horse.power_rating ?? 0
                        ),

                    confidence:
                        Number(
                            horse.confidence ?? 0
                        ),

                    confidence_grade:
                        horse.confidence_grade || null,

                    odds:
                        horse.current_odds || null,

                    form:
                        horse.form || null,

                    rating_breakdown:
                        horse.rating_breakdown || null,

                    engine_details:
                        horse.engine_details || null,

                    tier:
                        classification.tier,

                    label:
                        classification.label

                };


                // ------------------------------------------------------------
                // STRONG CANDIDATE
                // ------------------------------------------------------------

                if (
                    classification.tier === "Strong"
                ) {

                    strongCandidates.push(
                        candidate
                    );

                }


                // ------------------------------------------------------------
                // WORTH CONSIDERING
                // ------------------------------------------------------------

                else {

                    worthConsidering.push(
                        candidate
                    );

                }

            }

        }

    }


    // ========================================================================
    // SORT STRONG CANDIDATES
    // ========================================================================
    //
    // Highest EPR first.
    //
    // Confidence is the secondary sort.
    //
    // ========================================================================

    strongCandidates.sort((a, b) => {

        const powerDifference =
            b.power_rating -
            a.power_rating;


        if (powerDifference !== 0)
            return powerDifference;


        return (
            b.confidence -
            a.confidence
        );

    });


    // ========================================================================
    // SORT WORTH CONSIDERING
    // ========================================================================
    //
    // Highest EPR first.
    //
    // Confidence is the secondary sort.
    //
    // ========================================================================

    worthConsidering.sort((a, b) => {

        const powerDifference =
            b.power_rating -
            a.power_rating;


        if (powerDifference !== 0)
            return powerDifference;


        return (
            b.confidence -
            a.confidence
        );

    });


    // ========================================================================
    // RETURN DASHBOARD DATA
    // ========================================================================

    return {

        success: true,

        dashboard: {

            daily,

            nap,

            bestOpportunity,

            strongCandidates,

            worthConsidering,

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


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {

    getDashboard

};