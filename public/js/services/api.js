// Static site (2026-11-05): the API answers are files under data/, rebuilt on
// every odds refresh by js/buildStaticSite.js (Vercel paused the serverless
// API until 5 Dec for CPU). ?t= stops a cached copy hiding a new build.
const data = p => fetch(`data/${p}.json?t=${Date.now()}`, { cache: "no-store" });

export async function getDashboard() {

    const response = await data("dashboard");

    if (!response.ok) {
        throw new Error("Unable to load dashboard");
    }

    return await response.json();

}

export async function getMeetings() {

    const response = await data("meetings");

    return await response.json();

}

export async function getRaces(meetingId) {

    const response = await data(`meetings/${meetingId}/races`);

    if (!response.ok) {
        throw new Error("Unable to load races");
    }

    return await response.json();

}

export async function getRace(meetingId, raceIndex) {

    const response = await data(`meetings/${meetingId}/races/${raceIndex}`);

    if (!response.ok)
        throw new Error("Unable to load race");

    return await response.json();

}
