const json = require("./jsonService");

// ============================================================================
// EPR DASHBOARD SERVICE
// Candidate board uses the production-style race separation tier.
//
// IMPORTANT:
// - final_ratings.json is the source of EPR ratings.
// - stage2_cards.json is used for the card/race clock statistics.
// - We do NOT use arbitrary EPR/confidence thresholds to create the board.
// - Strong = production-style Strong race separation.
// - Worth Considering = production-style Moderate race separation.
// ============================================================================

const TIER_STRONG_CUT = 0.50;
const TIER_MODERATE_CUT = 0.30;
const TIER_MIN_FIELD_FOR_STRONG = 5;
const TIER_MIN_ABSOLUTE_MARGIN = 1.0;


function classifyRace(runners) {

    const valid = (runners || [])
        .filter(r =>
            r &&
            r.isNonRunner !== true &&
            Number.isFinite(Number(r.power_rating))
        )
        .slice()
        .sort(
            (a, b) =>
                Number(b.power_rating) -
                Number(a.power_rating)
        );

    if (valid.length < 2)
        return null;

    const top = Number(valid[0].power_rating);
    const second = Number(valid[1].power_rating);
    const last = Number(valid[valid.length - 1].power_rating);

    const margin = top - second;
    const spread = top - last;

    const relativeMargin =
        spread > 0
            ? (
                valid.length >= 3
                    ? margin / spread
                    : (top > 0 ? margin / top : 0)
            )
            : 0;

    if (margin < TIER_MIN_ABSOLUTE_MARGIN) {

        return {
            tier: "Open",
            margin,
            relativeMargin,
            runners: valid
        };
    }

    let tier = "Open";

    if (
        relativeMargin >= TIER_STRONG_CUT &&
        valid.length >= TIER_MIN_FIELD_FOR_STRONG
    ) {

        tier = "Strong";

    } else if (
        relativeMargin >= TIER_MODERATE_CUT
    ) {

        tier = "Moderate";
    }

    return {
        tier,
        margin,
        relativeMargin,
        runners: valid
    };
}


function makeCandidate(
    meetingId,
    meeting,
    race,
    raceIndex,
    top,
    tierInfo
) {

    return {

        name:
            top.name || "-",

        horse:
            top.name || "-",

        meeting:
            meeting.name || "-",

        course:
            meeting.name || "-",

        race:
            race.time || "",

        raceTime:
            race.time || "",

        meetingId,

        raceIndex,

        silkUrl:
            top.silk_url ||
            top.silkUrl ||
            null,

        silk_url:
            top.silk_url ||
            top.silkUrl ||
            null,

        power_rating:
            Number(top.power_rating),

        rating:
            Number(top.power_rating),

        confidence:
            Number.isFinite(Number(top.confidence))
                ? Number(top.confidence)
                : null,

        confidence_grade:
            top.confidence_grade || null,

        gap:
            Number(tierInfo.margin.toFixed(1)),

        relativeMargin:
            Number(tierInfo.relativeMargin.toFixed(3)),

        fieldSize:
            tierInfo.runners.length,

        odds:
            top.current_odds ??
            top.odds ??
            null,

        form:
            top.form || null,

        rating_breakdown:
            top.rating_breakdown || null,

        engine_details:
            top.engine_details || null,

        tier:
            tierInfo.tier,

        candidateType:
            tierInfo.tier === "Strong"
                ? "STRONG"
                : "WORTH CONSIDERING",

        label:
            tierInfo.tier === "Strong"
                ? "STRONG CANDIDATE"
                : "WORTH CONSIDERING"
    };
}


function getDashboard() {

    const daily =
        json.load("daily_data.json");

    const ratings =
        json.load("final_ratings.json");

    const nap =
        json.load("nap_spotlight.json");

    const cards =
        json.load("stage2_cards.json");


    let meetings = 0;
    let races = 0;
    let runners = 0;

    let raceCardDate = null;
    let bestOpportunity = null;


    // ------------------------------------------------------------------------
    // DATE
    // ------------------------------------------------------------------------

    for (const meeting of Object.values(daily || {})) {

        const date =
            meeting?.meeting_summary?.date;

        if (date) {

            raceCardDate = date;
            break;
        }
    }


    // ------------------------------------------------------------------------
    // CARD STATISTICS / RACE TIMES
    // ------------------------------------------------------------------------

    meetings =
        Object.keys(cards || {}).length;

    const raceTimes = [];

    for (const meeting of Object.values(cards || {})) {

        if (!Array.isArray(meeting?.races))
            continue;

        races += meeting.races.length;

        for (const race of meeting.races) {

            if (!Array.isArray(race?.runners))
                continue;

            runners += race.runners.length;

            raceTimes.push({

                course:
                    meeting.name || "",

                time:
                    race.time || ""
            });
        }
    }


    // ------------------------------------------------------------------------
    // BEST OPPORTUNITY
    // ------------------------------------------------------------------------

    for (
        const [meetingId, meeting]
        of Object.entries(ratings || {})
    ) {

        if (!Array.isArray(meeting?.races))
            continue;

        meeting.races.forEach(
            (race, raceIndex) => {

                if (!Array.isArray(race?.runners))
                    return;

                for (const runner of race.runners) {

                    if (
                        runner?.isNonRunner === true
                    )
                        continue;

                    const rating =
                        Number(runner?.power_rating);

                    if (!Number.isFinite(rating))
                        continue;

                    if (
                        !bestOpportunity ||
                        rating >
                        Number(bestOpportunity.rating)
                    ) {

                        bestOpportunity = {

                            horse:
                                runner.name,

                            rating,

                            confidence:
                                runner.confidence,

                            course:
                                meeting.name,

                            raceTime:
                                race.time,

                            silkUrl:
                                runner.silk_url ||
                                null,

                            meetingId,

                            raceIndex
                        };
                    }
                }
            }
        );
    }


    // ------------------------------------------------------------------------
    // TODAY'S BETTING CANDIDATES
    //
    // ONE candidate per race:
    // the highest EPR runner.
    //
    // Strong      -> primary candidate
    // Moderate    -> Worth Considering
    // Open        -> omitted
    // ------------------------------------------------------------------------

    const strongCandidates = [];
    const worthConsidering = [];


    for (
        const [meetingId, meeting]
        of Object.entries(ratings || {})
    ) {

        if (!Array.isArray(meeting?.races))
            continue;


        meeting.races.forEach(
            (race, raceIndex) => {

                if (!Array.isArray(race?.runners))
                    return;


                const tierInfo =
                    classifyRace(race.runners);

                if (!tierInfo)
                    return;


                const top =
                    tierInfo.runners[0];


                if (
                    tierInfo.tier === "Strong"
                ) {

                    strongCandidates.push(
                        makeCandidate(
                            meetingId,
                            meeting,
                            race,
                            raceIndex,
                            top,
                            tierInfo
                        )
                    );

                } else if (
                    tierInfo.tier === "Moderate"
                ) {

                    worthConsidering.push(
                        makeCandidate(
                            meetingId,
                            meeting,
                            race,
                            raceIndex,
                            top,
                            tierInfo
                        )
                    );
                }
            }
        );
    }


    // ------------------------------------------------------------------------
    // SORT
    // ------------------------------------------------------------------------

    strongCandidates.sort(
        (a, b) =>
            b.relativeMargin - a.relativeMargin ||
            b.power_rating - a.power_rating ||
            b.confidence - a.confidence
    );


    worthConsidering.sort(
        (a, b) =>
            b.relativeMargin - a.relativeMargin ||
            b.power_rating - a.power_rating ||
            b.confidence - a.confidence
    );


    // ------------------------------------------------------------------------
    // RETURN
    // ------------------------------------------------------------------------

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


module.exports = {

    getDashboard

};
