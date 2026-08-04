/*
==========================================================
 Elite Power Ratings
 File : js/clock.js
 Version : 1.0.0
==========================================================
*/

const isBST = () => {
    const d = new Date();
    const stdTimezoneOffset = new Date(d.getFullYear(), 0, 1).getTimezoneOffset();
    return d.getTimezoneOffset() < stdTimezoneOffset;
};
const BST_OFFSET = isBST() ? 1 : 0;

// Converts a raw UTC time string (how the scraper stores race times,
// e.g. "13:35") into the correct local BST-aware display time
// (e.g. "14:35"). Used throughout dashboard.js wherever a race time
// is shown to the user. Guards against the "00:00" placeholder used
// for missing/unknown times.
function toLocalTimeString(utcTimeStr) {

    if (!utcTimeStr || utcTimeStr === "00:00") return "TBC";

    let [h, m] = utcTimeStr.split(":").map(Number);

    h += BST_OFFSET;
    if (h >= 1 && h <= 11) h += 12;
    if (h >= 24) h -= 24;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

}

function getLondonTime() {
    const now = new Date();

    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    }).formatToParts(now);

    const time = {};
    parts.forEach(({ type, value }) => time[type] = value);

    return {
        h: parseInt(time.hour),
        m: parseInt(time.minute),
        s: parseInt(time.second),
        totalSecs:
            (parseInt(time.hour) * 3600) +
            (parseInt(time.minute) * 60) +
            parseInt(time.second)
    };
}

function updateClock() {
    const london = getLondonTime();

    const clockEl = document.getElementById("live-clock");
    if (clockEl) {
        clockEl.innerText =
            `${london.h.toString().padStart(2, "0")}:` +
            `${london.m.toString().padStart(2, "0")}:` +
            `${london.s.toString().padStart(2, "0")}`;
    }

    if (allRaceTimes.length > 0) {

        const next = allRaceTimes.find(r => r.totalSecs > london.totalSecs);
        const display = document.getElementById("next-race-countdown");

        if (!display) return;

        if (next) {

            const diff = next.totalSecs - london.totalSecs;
            const mins = Math.floor(diff / 60);
            const secs = diff % 60;

            display.innerText =
                `${next.course} ${next.displayTime} - ${mins}m ${secs}s`;

            display.style.background =
                mins < 5 ? "#ef4444" : "var(--orange)";
        }
        else {

            display.innerText = "ALL RACES FINISHED";
            display.style.background = "#64748b";

        }
    }
}

// Checks odds for whichever race is currently loaded, roughly once a
// minute - decoupled from the 1-second display clock above, since
// checking that often would be excessive. dashboard.js sets
// window.currentRaceContext whenever a race is loaded; if nothing is
// loaded yet, this is a no-op. The actual endpoint only re-fetches
// from Sporting Life if the stored snapshot is stale - most calls
// here just get a fast "nothing new" response.
function checkOddsForCurrentRace() {

    const ctx = window.currentRaceContext;
    if (!ctx?.meetingId || ctx.raceIndex == null || !ctx.date || !ctx.courseName) return;

    // Don't keep checking a race that's clearly over - guards against
    // a browser tab left open long after the race finished (or open
    // past midnight into a new day), which would otherwise ping a
    // stale, concluded race forever.
    if (ctx.raceTime) {

        const london = getLondonTime();
        let [h, m] = ctx.raceTime.split(":").map(Number);

        h += BST_OFFSET;
        if (h >= 1 && h <= 11) h += 12;
        if (h >= 24) h -= 24;

        const targetSecs = (h * 3600) + (m * 60);
        const diff = targetSecs - london.totalSecs;

        if (diff <= -600) return; // more than 10 minutes past off - finished

    }

    const params = new URLSearchParams({
        meetingId: ctx.meetingId,
        raceIndex: ctx.raceIndex,
        date: ctx.date,
        courseName: ctx.courseName
    });

    fetch(`/api/checkOdds?${params}`)
        .then(r => r.json())
        .catch(() => {}); // silent - this is background enrichment, not critical path

}

setInterval(checkOddsForCurrentRace, 60000);

function setupRaceCountdown(raceTimeStr, elementId) {

    function refresh() {

        const el = document.getElementById(elementId);
        if (!el) return;

        const london = getLondonTime();

        let [h, m] = raceTimeStr.split(":").map(Number);

        h += BST_OFFSET;

        if (h >= 1 && h <= 11) h += 12;
        if (h >= 24) h -= 24;

        const targetSecs = (h * 3600) + (m * 60);
        const diff = targetSecs - london.totalSecs;

        if (diff > 0) {

            const mins = Math.floor(diff / 60);
            const secs = diff % 60;

            el.innerText = `⏱️ ${mins}m ${secs}s`;
            el.style.background = mins < 5 ? "#ef4444" : "#f97316";

        }
        else if (diff > -600) {

            el.innerText = "🚨 OFF";
            el.style.background = "#059669";

        }
        else {

            el.innerText = "🏁 FINISHED";
            el.style.background = "#64748b";

        }
    }

    refresh();

    if (window.timerPool?.[elementId]) {
        clearInterval(window.timerPool[elementId]);
    }

    window.timerPool ??= {};

    window.timerPool[elementId] =
        setInterval(refresh, 1000);
}