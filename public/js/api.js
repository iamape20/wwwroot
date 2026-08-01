async function apiGet(url) {

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();

}

async function getMeetings() {

    return apiGet("/api/meetings");

}

async function getDashboard() {

    return apiGet("/api/dashboard");

}

async function getRaces(meetingId) {

    return apiGet(`/api/meetings/${meetingId}/races`);

}

async function getRace(meetingId, raceIndex) {

    return apiGet(`/api/meetings/${meetingId}/races/${raceIndex}`);

}