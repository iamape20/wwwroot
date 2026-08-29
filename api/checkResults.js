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
                placings: (r.top_horses || []).map(h => ({
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
                details: []
            });

        }

        const today = new Date().toISOString().split("T")[0];
        const key = `liveResults:${today}`;
        const now = Date.now();

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
                ...existing
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
                })
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

                if (!race.placings?.length) {
                    continue;
                }

                /*
                 * Find our prediction for this exact race.
                 *
                 * runners[0] remains the authoritative top-rated
                 * selection because final_ratings.json is already
                 * sorted by rating.
                 */
                let ourTopPick = null;

                for (const meeting of Object.values(predictions)) {

                    if (meeting.name !== courseName) {
                        continue;
                    }

                    const predRace =
                        meeting.races?.find(
                            r => r.time === race.time
                        );

                    if (predRace?.runners?.length) {

                        ourTopPick =
                            predRace.runners[0];

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
                 * We have both a result and a prediction,
                 * so this race can now safely be counted.
                 */
                alreadyChecked.add(raceKey);

                tally.racesChecked++;

                const pickName =
                    normaliseHorseName(ourTopPick.name);

                /*
                 * Find our horse using the normalised name.
                 */
                const placing =
                    race.placings.find(
                        p =>
                            normaliseHorseName(p.name) ===
                            pickName
                    );

                /*
                 * Find the actual winner.
                 */
                const winner =
                    race.placings.find(
                        p => Number(p.position) === 1
                    );

                /*
                 * Keep the existing top-three place definition:
                 * positions 1, 2 and 3 count as a place.
                 */
                let outcome = "unplaced";

                if (Number(placing?.position) === 1) {

                    outcome = "won";

                    tally.topPickWins++;
                    tally.topPickPlaces++;

                } else if (
                    placing &&
                    Number(placing.position) <= 3
                ) {

                    outcome = "placed";

                    tally.topPickPlaces++;

                }

                /*
                 * Capture the actual top three for diagnostics.
                 * This does not affect the existing dashboard.
                 */
                const actualTopThree =
                    race.placings
                        .filter(p => Number(p.position) <= 3)
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
            ...tally
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