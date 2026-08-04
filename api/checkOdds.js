// backend/api/checkOdds.js
//
// Client-triggered odds snapshot endpoint - called periodically by
// clock.js while someone has a race page open, NOT a Vercel cron job
// (Vercel Cron's free tier only allows once-per-day, which wouldn't
// work here at all). Regular function invocations have no such limit.
//
// Design: only actually re-fetches Sporting Life if the stored
// snapshot for this race is stale (older than ODDS_FRESHNESS_MINUTES).
// This means many visitors' browsers can all ping this endpoint
// around the same time without triggering redundant scraping - only
// the first one after the freshness window expires does real work,
// everyone else gets a fast "nothing new yet" response from storage.

const axios = require("axios");
const cheerio = require("cheerio");
const { Redis } = require("@upstash/redis");

const redis = Redis.fromEnv();

const ODDS_FRESHNESS_MINUTES = 15;

function getSlug(name) {
    return String(name).replace(/[^a-z0-9\s]/gi, "").replace(/\s+/g, "-").toLowerCase();
}

async function fetchRaceData(meetingId, date, courseName, raceIndex) {

    const url = `https://www.sportinglife.com/racing/fast-cards/${meetingId}/${date}/${getSlug(courseName)}/`;

    const response = await axios.get(url, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    const $ = cheerio.load(response.data);
    const script = $("#__NEXT_DATA__");
    if (!script.length) return null;

    const data = JSON.parse(script.html());
    const card = data?.props?.pageProps?.meeting;
    const race = card?.races?.[raceIndex];
    if (!race) return null;

    const odds = {};

    for (const runner of race.runners || []) {
        const s = runner.selection || runner;
        const name = s.horse?.name;
        const currentOdds = s.betting?.current_odds;
        if (name && currentOdds) odds[name.toUpperCase()] = currentOdds;
    }

    // Withdrawn horses live in their own separate array, not mixed
    // into race.runners with a different status - confirmed directly
    // from real Sporting Life data (Roscommon, 2026-08-04).
    const nonRunners = (race.nonRunners || [])
        .map(r => (r.selection || r).horse?.name)
        .filter(Boolean)
        .map(name => name.toUpperCase());

    return { odds, nonRunners };

}

module.exports = async (req, res) => {

    try {

        const { meetingId, raceIndex, date, courseName } = req.query;

        if (!meetingId || raceIndex == null || !date || !courseName) {
            return res.status(400).json({ success: false, error: "meetingId, raceIndex, date, and courseName are all required." });
        }

        const key = `odds:${meetingId}:${raceIndex}`;

        const existing = await redis.get(key);
        const now = Date.now();

        if (existing?.lastChecked && (now - existing.lastChecked) < ODDS_FRESHNESS_MINUTES * 60 * 1000) {
            // Recently checked - return what we have, no re-fetch
            return res.json({ success: true, fresh: false, snapshots: existing.snapshots || [], nonRunners: existing.nonRunners || [] });
        }

        const currentData = await fetchRaceData(meetingId, date, courseName, Number(raceIndex));

        if (!currentData) {
            return res.json({ success: true, fresh: false, snapshots: existing?.snapshots || [], nonRunners: existing?.nonRunners || [], note: "Fetch failed, kept previous data" });
        }

        const snapshots = existing?.snapshots || [];
        snapshots.push({ time: now, odds: currentData.odds });

        // Keep a reasonable cap so one race's history doesn't grow
        // unbounded across a very long day
        const trimmed = snapshots.slice(-20);

        await redis.set(key, { lastChecked: now, snapshots: trimmed, nonRunners: currentData.nonRunners });

        res.json({ success: true, fresh: true, snapshots: trimmed, nonRunners: currentData.nonRunners });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }

};

module.exports.config = {
    maxDuration: 15
};