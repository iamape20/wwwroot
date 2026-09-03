const json = require("./jsonService");
const vulnerabilityEngine =
    require("../engine/vulnerabilityEngine");
const marketIntelligenceEngine =
    require("../engine/marketIntelligenceEngine");
	
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

function applyFrozenMarketHybrid(
    tierInfo,
    marketIntelligence
) {
    /*
    ============================================================================
    PRODUCTION MARKET-FIRST SELECTION

    Historical validation established that the market favourite materially
    outperforms EPR #1 across the reconstructed population.

    Production rule:

        Usable market intelligence:
            MARKET

        No usable market intelligence:
            EPR

    The EPR rating itself remains completely unchanged.

    This is deliberately simple. No margin/odds exception is retained because
    the final strategy tournament did not demonstrate that an EPR override
    reliably improves upon simply taking the market.
    ============================================================================
    */

    if (
        marketIntelligence?.available
    ) {
        return {
            decision: "MARKET",
            reason: "Market available - market-first production selection.",
            frozen_rule: "2026-MARKET-FIRST"
        };
    }

    return {
        decision: "EPR",
        reason: "No usable market intelligence - EPR fallback.",
        frozen_rule: "2026-MARKET-FIRST"
    };
}
function makeCandidate(
    meetingId,
    meeting,
    race,
    raceIndex,
    top,
    tierInfo,
    vulnerability,
    marketIntelligence
) {

    const marketHybrid =
        applyFrozenMarketHybrid(
            tierInfo,
            marketIntelligence
        );

    let selectedRunner = top;
    let selectionSource = "EPR";

    /*
    ========================================================================
    PRODUCTION HYBRID SELECTION

    The EPR rating remains untouched.

    The frozen market rule determines the actionable runner.

    If MARKET is selected, locate the actual market favourite in the
    production runner set and use that runner for the displayed selection.
    ========================================================================
    */

    if (
        marketHybrid.decision === "MARKET" &&
        marketIntelligence?.available
    ) {

        const marketName =
            String(
                marketIntelligence?.market?.favourite || ""
            )
                .trim()
                .toUpperCase();

        const marketRunner =
            tierInfo.runners.find(
                runner =>
                    String(
                        runner?.name || ""
                    )
                        .trim()
                        .toUpperCase() === marketName
            );

        if (marketRunner) {

            selectedRunner =
                marketRunner;

            selectionSource =
                "MARKET";
        }
    }

    return {

        name:
            selectedRunner.name || "-",

        horse:
            selectedRunner.name || "-",

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
            selectedRunner.silk_url ||
            selectedRunner.silkUrl ||
            null,

        silk_url:
            selectedRunner.silk_url ||
            selectedRunner.silkUrl ||
            null,

        power_rating:
            Number(
                selectedRunner.power_rating
            ),

        rating:
            Number(
                selectedRunner.power_rating
            ),

        confidence:
            Number.isFinite(
                Number(selectedRunner.confidence)
            )
                ? Number(selectedRunner.confidence)
                : null,

        confidence_grade:
            selectedRunner.confidence_grade ||
            null,

        gap:
            Number(
                tierInfo.margin.toFixed(1)
            ),

        relativeMargin:
            Number(
                tierInfo.relativeMargin.toFixed(3)
            ),

        fieldSize:
            tierInfo.runners.length,

        odds:
            selectedRunner.current_odds ??
            selectedRunner.odds ??
            null,

        form:
            selectedRunner.form ||
            null,

        rating_breakdown:
            selectedRunner.rating_breakdown ||
            null,

        engine_details:
            selectedRunner.engine_details ||
            null,

        vulnerability,

        market_intelligence:
            marketIntelligence,

        market_hybrid:
            marketHybrid,

        /*
        EPR #1 is preserved independently so we can see exactly what
        caused the production selection to change.
        */

        epr_original_pick: {
            horse:
                top.name || "-",

            rating:
                Number(top.power_rating),

            odds:
                top.current_odds ??
                top.odds ??
                null
        },

        selection_source:
            selectionSource,

        tier:
            tierInfo.tier,

        candidateType:
            tierInfo.tier === "Strong"
                ? "STRONG"
                : "WORTH CONSIDERING",

        label:
            selectionSource === "MARKET"
                ? "MARKET SELECTION"
                : (
                    tierInfo.tier === "Strong"
                        ? "STRONG CANDIDATE"
                        : "WORTH CONSIDERING"
                )
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

 // ------------------------------------------------------------------------
// BEST OPPORTUNITY
//
// IMPORTANT:
// Best Opportunity must ONLY come from a race that is actually
// considered a valid betting opportunity.
//
// Do NOT simply select the highest EPR on the card.
// A high-rated horse in a VOID/OPEN race must never become
// the dashboard Best Opportunity.
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

            const tierInfo =
                classifyRace(race.runners);

            if (!tierInfo)
                return;

            // ------------------------------------------------------------
            // VOID / OPEN races are not betting opportunities.
            //
            // Strong candidates require a minimum 10-point absolute gap.
            // Keep Best Opportunity aligned with that production rule.
            // ------------------------------------------------------------

            if (
                tierInfo.tier !== "Strong" ||
                tierInfo.margin < 10
            ) {
                return;
            }

            const top =
                tierInfo.runners[0];

            if (!top)
                return;

            const marketIntelligence =
                marketIntelligenceEngine.analyseRace(
                    tierInfo.runners
                );
				
            const rating =
                Number(top.power_rating);

            if (!Number.isFinite(rating))
                return;

            if (
                !bestOpportunity ||
                rating >
                Number(bestOpportunity.rating)
            ) {

                bestOpportunity = {

                    horse:
                        top.name,

                    rating,

                    confidence:
                        top.confidence,

                    course:
                        meeting.name,

                    raceTime:
                        race.time,

                    silkUrl:
                        top.silk_url ||
                        null,

                    meetingId,

                    raceIndex,

                    gap:
                        Number(
                            tierInfo.margin.toFixed(1)
                        ),

                    relativeMargin:
                        Number(
                            tierInfo.relativeMargin.toFixed(3)
                        ),

					fieldSize:
							tierInfo.runners.length,

						market_intelligence:
							marketIntelligence
					};
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

				const vulnerability =
					vulnerabilityEngine.calculateVulnerability(
						tierInfo.runners
					);
					
				const marketIntelligence =
					marketIntelligenceEngine.analyseRace(
						tierInfo.runners
					);
	
			if (tierInfo.tier === "Strong") {
				if (tierInfo.margin >= 10) {

					strongCandidates.push(
						makeCandidate(
							meetingId,
							meeting,
							race,
							raceIndex,
							top,
							tierInfo,
							vulnerability,
							marketIntelligence
						)
					);
				}
			} else if (tierInfo.tier === "Moderate") {

					worthConsidering.push(
						makeCandidate(
							meetingId,
							meeting,
							race,
							raceIndex,
							top,
							tierInfo,
							vulnerability,
							marketIntelligence
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

