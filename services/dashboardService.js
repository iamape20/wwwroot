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
// - The EPR tier/margin gate above still decides WHICH races qualify as
//   candidates at all. But the runner actually DISPLAYED for a qualifying
//   race is decided separately, by applyFrozenMarketHybrid() below: when
//   usable market intelligence exists for that race, the market favourite
//   is shown instead of the EPR #1 pick (frozen_rule "2026-MARKET-FIRST").
//   The EPR rating itself is never altered - see epr_original_pick on each
//   candidate for what EPR alone would have picked.
// ============================================================================

const TIER_STRONG_CUT = 0.50;
const TIER_MODERATE_CUT = 0.30;
const TIER_MIN_FIELD_FOR_STRONG = 5;
const TIER_MIN_ABSOLUTE_MARGIN = 1.0;


// NOT re-sorted by raw power_rating, deliberately: race.runners is already
// produced by raceEngine.js's own sort (power_rating, THEN the market-
// override swap - see js/testMarketOverrideRule.js, shipped 2026-09-17),
// so re-sorting here would silently undo that override and compute
// margin/tier (and feed Best Opportunity / vulnerabilityEngine) against a
// runner order that doesn't match what's actually being backed. FOUND LIVE
// 2026-09-19: this function previously DID both re-sort AND filter on
// `isNonRunner` (a field that doesn't exist on these objects - the real
// field is `non_runner`, used everywhere else in this codebase - so
// non-runners were never actually excluded here). Both fixed to match
// js/marginTiers.js's real, validated classifyRace exactly.
function classifyRace(runners, raceTitle) {

    const valid = (runners || [])
        .filter(r =>
            r &&
            r.non_runner !== true &&
            Number.isFinite(Number(r.power_rating))
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

    // Market-clarity gate - mirrors js/marginTiers.js's marketGapRatio()
    // exactly (see that file for the full validation writeup: "vulnerable"
    // markets - 2nd favourite's price <50% longer than the favourite's -
    // ran calib z=-3.16, p=0.002, replicating independently in a
    // discovery half at p=0.0009 and a validation half at p=0.0001). This
    // is a property of the field's ODDS (favourite vs 2nd favourite), not
    // of which runner the market-hybrid selection ends up publishing, so
    // it cannot disagree with the actual published pick.
    if (tier === "Strong" || tier === "Moderate") {

        const priced = valid.map(r => parseOdds(r.current_odds)).filter(v => v != null).sort((a, b) => a - b);

        if (priced.length >= 2) {
            const gapRatio = (priced[1] + 1) / (priced[0] + 1);
            if (gapRatio < 1.5) {
                return {
                    tier: "Open",
                    margin,
                    relativeMargin,
                    runners: valid,
                    downgradedFrom: tier,
                    marketVulnerable: true,
                    marketGapRatio: gapRatio
                };
            }
        }

        // Handicap gate - mirrors js/marginTiers.js exactly (see that
        // file for the full validation writeup: non-handicap + clear-
        // market picks ran near-perfect calibration in both a discovery
        // half, p=0.81, and validation half, p=0.95; handicaps stayed
        // negative even when clear, -17.6% ROI vs +3.2% for
        // non-handicaps).
        if (typeof raceTitle === "string" && /handicap/i.test(raceTitle)) {
            return {
                tier: "Open",
                margin,
                relativeMargin,
                runners: valid,
                downgradedFrom: tier,
                isHandicap: true
            };
        }
    }

    return {
        tier,
        margin,
        relativeMargin,
        runners: valid
    };
}

// Raw fraction ratio - only used to compare PRICES between runners,
// matching checklistEngine.js's parseFractionalOdds convention in the
// root repo.
function parseOdds(value) {
    if (typeof value !== "string") return null;
    const clean = value.trim().toLowerCase();
    if (clean === "evens" || clean === "evs") return 1;
    const fractionMatch = clean.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) return Number(fractionMatch[1]) / Number(fractionMatch[2]);
    const whole = Number(clean);
    return isNaN(whole) ? null : (whole > 0 ? whole : null);
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

    // Trainer hot/cold form gate - checked here, after selectedRunner is
    // finalized (EPR pick or market-hybrid override, whichever won above),
    // not on the earlier pre-override `top` param - same reasoning as
    // generateDailyShortlist.js. See js/a1ratings_v3.js for the full
    // validation writeup. Returning null signals the caller to skip this
    // candidate entirely.
    if (selectedRunner.trainer_trend === "cold") {
        return null;
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

    let dailyDoubleData = null;
    try {
        dailyDoubleData = json.load("shortlist.json");
    } catch (err) {
        dailyDoubleData = null;
    }

	// ADD alongside the existing dailyDoubleData block
	let yesterdayResultsData = null;
	try {
		yesterdayResultsData = json.load("yesterday-results.json");
	} catch (err) {
		yesterdayResultsData = null;
	}

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

	for (const [meetingId, meeting] of Object.entries(cards || {})) {

		if (!Array.isArray(meeting?.races))
			continue;

		races += meeting.races.length;

		meeting.races.forEach((race, raceIndex) => {

			if (!Array.isArray(race?.runners))
				return;

			runners += race.runners.length;

			raceTimes.push({

				course:
					meeting.name || "",

				time:
					race.time || "",

				meetingId,

				raceIndex
			});
		});
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
                classifyRace(race.runners, race.display_title);

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

            // Trainer hot/cold form gate - see js/a1ratings_v3.js for the
            // full validation writeup. No market-hybrid override in this
            // block, so top is already the final pick being evaluated here.
            if (top.trainer_trend === "cold")
                return;

            const marketIntelligence =
                marketIntelligenceEngine.analyseRace(
                    tierInfo.runners
                );
				
            const rating =
                Number(top.power_rating);

            if (!Number.isFinite(rating))
                return;

            const opportunityRelativeMargin =
                Number(
                    tierInfo.relativeMargin
                );

            const opportunityConfidence =
                Number(
                    top.confidence
                );

            const shouldReplaceBestOpportunity =
                !bestOpportunity ||
                opportunityRelativeMargin >
                    Number(bestOpportunity.relativeMargin) ||
                (
                    opportunityRelativeMargin ===
                        Number(bestOpportunity.relativeMargin) &&
                    rating >
                        Number(bestOpportunity.rating)
                ) ||
                (
                    opportunityRelativeMargin ===
                        Number(bestOpportunity.relativeMargin) &&
                    rating ===
                        Number(bestOpportunity.rating) &&
                    opportunityConfidence >
                        Number(bestOpportunity.confidence)
                );

            if (shouldReplaceBestOpportunity) {

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
                    classifyRace(race.runners, race.display_title);

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

					const candidate = makeCandidate(
						meetingId,
						meeting,
						race,
						raceIndex,
						top,
						tierInfo,
						vulnerability,
						marketIntelligence
					);

					if (candidate) strongCandidates.push(candidate);
				}
			} else if (tierInfo.tier === "Moderate") {

					const candidate = makeCandidate(
						meetingId,
						meeting,
						race,
						raceIndex,
						top,
						tierInfo,
						vulnerability,
						marketIntelligence
					);

					if (candidate) worthConsidering.push(candidate);
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

            dailyDouble:

			dailyDoubleData?.dailyDouble || [],

			dailyDoublePickMode:

			dailyDoubleData?.pickMode || null,

			yesterdayResults:
    
			yesterdayResultsData,
	
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


