// backend/api/checkResults.js
//
// Sweeps ALL of today's finished races (not just one, unlike
// checkOdds.js) - reuses the exact same fetch/parse logic already
// proven in the local a1results.js. Compares each finished race's
// real result against our own top pick (from final_ratings.json),
// and maintains a running daily tally in Redis - a genuinely live
// complement to the local trackRecord.js, which stays the source of
// truth for testing/backtesting.
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

async function fetchTodaysResults() {

    const response = await axios.get(RESULTS_URL, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    const $ = cheerio.load(response.data);
    const script = $("#__NEXT_DATA__");
    if (!script.length) return null;

    const data = JSON.parse(script.html());
    const meetings = data?.props?.pageProps?.meetings || [];

    const output = {};

    for (const meeting of meetings) {

        const courseName = meeting.meeting_summary?.course?.name;
        const date = meeting.meeting_summary?.date;
        if (!courseName || !date) continue;

        const races = (meeting.races || [])
            .filter(r => r.race_stage === "WEIGHEDIN")
            .map(r => ({
                time: r.time,
                placings: (r.top_horses || []).map(h => ({ name: h.name, position: h.position }))
            }));

        if (!races.length) continue;

        if (!output[courseName]) output[courseName] = { date, races: [] };
        output[courseName].races.push(...races);

    }

    return output;

}

function loadPredictions() {
    try {
        return { predictions: json.load("final_ratings.json"), loaded: true };
    } catch (err) {
        return { predictions: {}, loaded: false, error: err.message };
    }
}

module.exports = async (req, res) => {

    try {

        if (!redis) {
            return res.json({ success: true, fresh: false, note: "Redis not configured (expected in local dev) - live results tracking only runs on the deployed site.", racesChecked: 0, topPickWins: 0, topPickPlaces: 0, details: [] });
        }

        const today = new Date().toISOString().split("T")[0];
        const key = `liveResults:${today}`;

        const existing = await redis.get(key);
        const now = Date.now();

        if (existing?.lastChecked && (now - existing.lastChecked) < CHECK_FRESHNESS_MINUTES * 60 * 1000) {
            return res.json({ success: true, fresh: false, ...existing });
        }

        const results = await fetchTodaysResults();

        if (!results) {
            return res.json({ success: true, fresh: false, ...(existing || { racesChecked: 0, topPickWins: 0, topPickPlaces: 0, details: [] }) });
        }

        const { predictions, loaded: predictionsLoaded, error: predictionsError } = loadPredictions();

        const tally = existing || { racesChecked: 0, topPickWins: 0, topPickPlaces: 0, checkedRaces: [], details: [] };
        const alreadyChecked = new Set(tally.checkedRaces || []);

        for (const [courseName, courseResults] of Object.entries(results)) {

            for (const race of courseResults.races) {

                const raceKey = `${courseName}_${race.time}`;
                if (alreadyChecked.has(raceKey)) continue;
                if (!race.placings?.length) continue;

                // Find our own prediction for this exact race
                let ourTopPick = null;

                for (const meeting of Object.values(predictions)) {
                    if (meeting.name !== courseName) continue;
                    const predRace = meeting.races?.find(r => r.time === race.time);
                    if (predRace?.runners?.length) {
                        ourTopPick = predRace.runners[0]; // already sorted by rating
                        break;
                    }
                }

                if (!ourTopPick) continue; // we had no prediction for this race - skip, don't count

                alreadyChecked.add(raceKey);
                tally.racesChecked++;

                const pickNameUpper = String(ourTopPick.name || "").toUpperCase();
                const placing = race.placings.find(p => p.name.toUpperCase() === pickNameUpper);

                let outcome = "unplaced";
                if (placing?.position === 1) {
                    outcome = "won";
                    tally.topPickWins++;
                    tally.topPickPlaces++;
                } else if (placing && placing.position <= 3) {
                    outcome = "placed";
                    tally.topPickPlaces++;
                }

                tally.details.push({ course: courseName, time: race.time, ourPick: ourTopPick.name, outcome });

            }

        }

        tally.checkedRaces = [...alreadyChecked];
        tally.lastChecked = now;

        // Keep the details list from growing unbounded across a long day
        tally.details = tally.details.slice(-50);

        await redis.set(key, tally, { ex: 172800 });

        res.json({ success: true, fresh: true, predictionsLoaded, predictionsError, ...tally });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }

};

module.exports.config = {
    maxDuration: 15
};
