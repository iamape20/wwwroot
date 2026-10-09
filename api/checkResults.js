// backend/api/checkResults.js
//
// Sweeps ALL of today's finished races (not just one, unlike
// checkOdds.js) - reuses the exact same fetch/parse logic already
// proven in the local a1results.js. Compares each finished race's
// real result against our own top pick (from final_ratings.json),
// and maintains a running daily tally in Redis.
//
// Triggered from the DASHBOARD page (not individual race pages),
// since results tracking needs to sweep the whole day, not one race.

const axios = require("axios");
const cheerio = require("cheerio");
const { Redis } = require("@upstash/redis");
const json = require("../services/jsonService");

const redis = (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    ? Redis.fromEnv()
    : null;

const RESULTS_URL = "https://www.sportinglife.com/racing/results";
const CHECK_FRESHNESS_MINUTES = 5;


/*
 * Standard UK/IRE each-way place terms by declared runners
 * (2026-09-30 - "placed" used to mean top 3 in any field, so 3rd of 5
 * counted as a place when no bookmaker would pay it):
 *   1-4 runners: win only, 5-7: 2 places, 8-15: 3,
 *   16+: 4 in a handicap, otherwise 3.
 * Mirrored in js/placeTerms.js (root pipeline) - keep the two in step.
 */
function placesForField(runners, raceTitle) {
    if (!Number.isFinite(runners) || runners <= 0) return 3;
    if (runners <= 4) return 1;
    if (runners <= 7) return 2;
    if (runners <= 15) return 3;
    return /handicap|nursery/i.test(String(raceTitle || "")) ? 4 : 3;
}

function getSlug(name) {
    return String(name).replace(/[^a-z0-9\s]/gi, "").replace(/\s+/g, "-").toLowerCase();
}

/*
 * The results LISTING page (fetchTodaysResults below) only ever
 * returns "top_horses" - a truncated list of the first 2-3
 * finishers. A horse that genuinely finished 3rd is sometimes just
 * absent from that list (SportingLife shows 2 for some races, 3 for
 * others), which silently misclassifies a real placed finish as
 * "unplaced" - confirmed 2026-09-24 with Newmarket 12:15, Code Of
 * Honour (genuine 3rd, listing only carried the top 2).
 *
 * js/a1results.js hit this exact issue in August and fixed it by
 * fetching each race's own detail page, which carries a full
 * "rides" array with every runner's true finish_position. This is
 * that same fix, ported here. Unlike a1results.js's backfill sweep
 * (90+ races, sequential, no time budget), this only ever runs for
 * races that are BOTH new this check cycle AND ones we have a
 * prediction for - normally 0-3 per invocation - so it stays well
 * inside this endpoint's 15s maxDuration without needing a retry
 * delay. Falls back to the truncated top_horses list on any failure.
 */
async function fetchFullField(date, courseName, raceId, slug) {

    const url = `${RESULTS_URL}/${date}/${getSlug(courseName)}/${raceId}/${slug || "race"}`;

    try {

        const response = await axios.get(url, {
            timeout: 8000,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });

        const $ = cheerio.load(response.data);
        const script = $("#__NEXT_DATA__");

        if (!script.length) {
            return null;
        }

        const data = JSON.parse(script.html());
        const race = data?.props?.pageProps?.race;

        if (!Array.isArray(race?.rides)) {
            return null;
        }

        return race.rides
            .map(ride => ({
                name: ride.horse?.name,
                position: ride.finish_position
            }))
            .filter(p => p.name && p.position);

    } catch {

        return null;

    }

}

/*
 * Normalise horse names before comparing them.
 *
 * This protects the live tracker against harmless formatting
 * differences between our prediction data and Sporting Life.
 *
 * Examples:
 *   "LILY PINK"       -> "LILYPINK"
 *   " Lily  Pink "    -> "LILYPINK"
 *   "LILY-PINK"       -> "LILYPINK"
 */
function normaliseHorseName(name) {

    return String(name || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

}

async function fetchTodaysResults() {

    const response = await axios.get(RESULTS_URL, {
        timeout: 8000,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
    });

    const $ = cheerio.load(response.data);
    const script = $("#__NEXT_DATA__");

    if (!script.length) {
        return null;
    }

    const data = JSON.parse(script.html());
    const meetings = data?.props?.pageProps?.meetings || [];

    const output = {};

    for (const meeting of meetings) {

        const courseName = meeting.meeting_summary?.course?.name;
        const date = meeting.meeting_summary?.date;

        if (!courseName || !date) {
            continue;
        }

        const races = (meeting.races || [])
            .filter(r => r.race_stage === "WEIGHEDIN")
            .map(r => ({
                time: r.time,
                raceId: r.race_summary_reference?.id || null,
                slug: r.race_slug || null,
                // Truncated fallback - see fetchFullField above for why
                // the main loop prefers a per-race detail fetch first.
                topHorses: (r.top_horses || []).map(h => ({
                    name: h.name,
                    position: h.position
                }))
            }));

        if (!races.length) {
            continue;
        }

        if (!output[courseName]) {
            output[courseName] = {
                date,
                races: []
            };
        }

        output[courseName].races.push(...races);

    }

    return output;

}

function loadPredictions() {

    try {

        return {
            predictions: json.load("final_ratings.json"),
            loaded: true
        };

    } catch (err) {

        return {
            predictions: {},
            loaded: false,
            error: err.message
        };

    }

}

module.exports = async (req, res) => {

    try {

        /*
         * Local development normally has no Redis connection.
         * Do not attempt live result tracking locally.
         */
        if (!redis) {

            return res.json({
                success: true,
                fresh: false,
                note: "Redis not configured (expected in local dev) - live results tracking only runs on the deployed site.",
                racesChecked: 0,
                topPickWins: 0,
                topPickPlaces: 0,
                details: [],
                yesterday: null
            });

        }

        // UK calendar date, not UTC (2026-10-03): Sporting Life's results
        // page is the UK racing day, but toISOString() is UTC, so from
        // 00:00 to 01:00 BST "today" was still the previous day - the
        // strip showed yesterday's races as today's.
        const now = Date.now();
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
        const key = `liveResults:${today}`;

        /*
         * Yesterday's tally is still sitting in Redis under its own
         * date key (the 48-hour TTL below comfortably covers it) -
         * read-only here, never written to. Summary numbers only
         * (not the full details array) since this is just a one-line
         * comparison alongside today's live strip, not a second full
         * results feed.
         */
        // The calendar day before `today` (via midday UTC, so a 23- or
        // 25-hour clock-change day can't skip or repeat a date).
        const yesterdayDate = new Date(Date.parse(`${today}T12:00:00Z`) - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const yesterdayStored = await redis.get(`liveResults:${yesterdayDate}`);
        const yesterday = yesterdayStored?.racesChecked
            ? {
                date: yesterdayDate,
                racesChecked: yesterdayStored.racesChecked,
                topPickWins: yesterdayStored.topPickWins || 0,
                topPickPlaces: yesterdayStored.topPickPlaces || 0
            }
            : null;

        /*
         * Avoid repeatedly fetching Sporting Life more often than
         * the configured freshness window.
         */
        const existing = await redis.get(key);

        if (
            existing?.lastChecked &&
            (now - existing.lastChecked) <
                CHECK_FRESHNESS_MINUTES * 60 * 1000
        ) {

            return res.json({
                success: true,
                fresh: false,
                ...existing,
                yesterday
            });

        }

        const results = await fetchTodaysResults();

        /*
         * If Sporting Life cannot currently be read, preserve the
         * existing tally rather than treating anything as a failure.
         */
        if (!results) {

            return res.json({
                success: true,
                fresh: false,
                ...(existing || {
                    racesChecked: 0,
                    topPickWins: 0,
                    topPickPlaces: 0,
                    details: []
                }),
                yesterday
            });

        }

        const {
            predictions,
            loaded: predictionsLoaded,
            error: predictionsError
        } = loadPredictions();

        const tally = existing || {
            racesChecked: 0,
            topPickWins: 0,
            topPickPlaces: 0,
            checkedRaces: [],
            details: []
        };

        const alreadyChecked = new Set(
            tally.checkedRaces || []
        );

        for (const [courseName, courseResults] of Object.entries(results)) {

            for (const race of courseResults.races) {

                /*
                 * Include the date in the key so the identifier is
                 * unambiguous even if Redis data survives unexpectedly.
                 */
                const raceKey =
                    `${courseResults.date}_${courseName}_${race.time}`;

                if (alreadyChecked.has(raceKey)) {
                    continue;
                }

                if (!race.topHorses?.length) {
                    continue;
                }

                /*
                 * Find our prediction for this exact race.
                 *
                 * runners[0] is the authoritative top-rated selection
                 * because final_ratings.json is already sorted by
                 * rating - but that sort never excludes non-runners
                 * (a withdrawn horse can still carry the field's
                 * highest power_rating), so non-runners are filtered
                 * out here first, matching every other live consumer
                 * of this data (generateDailyShortlist.js,
                 * dashboardService.js, eliteSpotlight.js).
                 */
                let ourTopPick = null;
                let placesPaid = 3;

                for (const meeting of Object.values(predictions)) {

                    if (meeting.name !== courseName) {
                        continue;
                    }

                    const predRace =
                        meeting.races?.find(
                            r => r.time === race.time
                        );

                    const activeRunners =
                        predRace?.runners?.filter(
                            r => r && r.non_runner !== true
                        );

                    if (activeRunners?.length) {

                        ourTopPick =
                            activeRunners[0];

                        placesPaid =
                            placesForField(
                                activeRunners.length,
                                predRace.display_title || predRace.title
                            );

                        break;

                    }

                }

                /*
                 * We had no prediction for this race.
                 * Do not count it and do not mark it as checked.
                 */
                if (!ourTopPick) {
                    continue;
                }

                /*
                 * Prefer the full field from the race's own detail
                 * page (see fetchFullField) over the listing's
                 * truncated top_horses - this only runs for races
                 * that are new this cycle AND that we have a
                 * prediction for, so it stays cheap. Falls back to
                 * the truncated list if the detail fetch fails.
                 */
                const fullField =
                    race.raceId
                        ? await fetchFullField(
                            courseResults.date,
                            courseName,
                            race.raceId,
                            race.slug
                        )
                        : null;

                const placings = fullField || race.topHorses;

                const pickName =
                    normaliseHorseName(ourTopPick.name);

                /*
                 * Find our horse using the normalised name.
                 */
                const placing =
                    placings.find(
                        p =>
                            normaliseHorseName(p.name) ===
                            pickName
                    );

                /*
                 * Detail fetch failed and our pick isn't in the
                 * truncated top 2-3: it may still have placed (the
                 * 2026-09-24 Code Of Honour case), and once a race is
                 * marked checked it is never looked at again. Leave
                 * it unchecked so the next cycle retries the full
                 * field (2026-10-09).
                 */
                if (race.raceId && !fullField && !placing) {
                    continue;
                }

                /*
                 * We have both a result and a prediction,
                 * so this race can now safely be counted.
                 */
                alreadyChecked.add(raceKey);

                tally.racesChecked++;

                /*
                 * Find the actual winner.
                 */
                const winner =
                    placings.find(
                        p => Number(p.position) === 1
                    );

                /*
                 * "Placed" follows standard each-way place terms for
                 * the declared field (2026-09-30, was always top 3):
                 * see placesForField.
                 */
                let outcome = "unplaced";

                if (Number(placing?.position) === 1) {

                    outcome = "won";

                    tally.topPickWins++;
                    tally.topPickPlaces++;

                } else if (
                    placing &&
                    Number(placing.position) >= 1 &&
                    Number(placing.position) <= placesPaid
                ) {

                    outcome = "placed";

                    tally.topPickPlaces++;

                }

                /*
                 * Capture the actual top three for diagnostics.
                 * This does not affect the existing dashboard.
                 *
                 * position >= 1 excludes non-finishers - SportingLife
                 * uses position: 0 (with a casualtyReason like
                 * "PulledUp"/"Fell"/"Unseated") for a horse that didn't
                 * complete the race, not "finished 0th". Without this
                 * guard a pulled-up favourite reads as a podium finish
                 * - confirmed live 2026-09-25 (Worcester 14:15, Premier
                 * Tenor pulled up, would have shown as "placed").
                 */
                const actualTopThree =
                    placings
                        .filter(p => Number(p.position) >= 1 && Number(p.position) <= 3)
                        .sort(
                            (a, b) =>
                                Number(a.position) -
                                Number(b.position)
                        )
                        .map(p => p.name)
                        .filter(Boolean);

                /*
                 * Keep all existing fields used by dashboard.js
                 * and verifyDeployment.js.
                 *
                 * New fields:
                 *   ourPickPosition
                 *   actualTopThree
                 */
                tally.details.push({

                    course: courseName,
                    time: race.time,

                    ourPick:
                        ourTopPick.name,

                    ourPickPosition:
                        placing?.position ?? null,

                    outcome,

                    actualWinner:
                        winner?.name || null,

                    actualTopThree

                });

            }

        }

        tally.checkedRaces =
            [...alreadyChecked];

        tally.lastChecked = now;

        /*
         * Keep the details list from growing unbounded across
         * a long day.
         */
        tally.details =
            tally.details.slice(-50);

        await redis.set(
            key,
            tally,
            { ex: 172800 }
        );

        res.json({
            success: true,
            fresh: true,
            predictionsLoaded,
            predictionsError,
            ...tally,
            yesterday
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

};

module.exports.config = {
    maxDuration: 15
};