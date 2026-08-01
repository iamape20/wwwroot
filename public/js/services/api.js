export async function getDashboard() {

    const response = await fetch("/api/dashboard");

    if (!response.ok) {
        throw new Error("Unable to load dashboard");
    }

    return await response.json();

}

export async function getMeetings() {

    const response = await fetch("/api/meetings");

    return await response.json();

}

export async function getRaces(meetingId) {

    const response = await fetch(`/api/meetings/${meetingId}/races`);

    if (!response.ok) {
        throw new Error("Unable to load races");
    }

    return await response.json();

}

export async function getRace(meetingId, raceIndex) {

    const response = await fetch(
        `/api/meetings/${meetingId}/races/${raceIndex}`
    );

    if (!response.ok)
        throw new Error("Unable to load race");

    return await response.json();

}