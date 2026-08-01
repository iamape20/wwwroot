/*
==========================================================
 Elite Power Ratings
 File : js/clock.js
 Version : 1.1.0 - restyled for consistent brand colours
==========================================================
*/

const isBST = () => {
    const d = new Date();
    const stdTimezoneOffset = new Date(d.getFullYear(), 0, 1).getTimezoneOffset();
    return d.getTimezoneOffset() < stdTimezoneOffset;
};
const BST_OFFSET = isBST() ? 1 : 0;

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

    if (window.allRaceTimes && window.allRaceTimes.length > 0) {

        const next = window.allRaceTimes.find(r => r.totalSecs > london.totalSecs);
        const display = document.getElementById("next-race-countdown");

        if (!display) return;

        if (next) {

            const diff = next.totalSecs - london.totalSecs;
            const mins = Math.floor(diff / 60);
            const secs = diff % 60;

            display.innerText =
                `Next: ${next.course} ${next.displayTime} — ${mins}m ${secs}s`;

            // Gold (existing brand accent) as it gets close, rather than
            // an alarm colour — stays consistent with the hero badge.
            display.style.color = mins < 5 ? "#D4AF37" : "#E5E7EB";

        }
        else {

            display.innerText = "All races finished for today";
            display.style.color = "#A0AEC0";

        }
    }
}

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

            el.innerText = `${mins}m ${secs}s`;
            el.style.color = mins < 5 ? "#D4AF37" : "#E5E7EB";

        }
        else if (diff > -600) {

            el.innerText = "OFF";
            el.style.color = "#A0AEC0";

        }
        else {

            el.innerText = "FINISHED";
            el.style.color = "#A0AEC0";

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

function toLocalTimeString(utcTimeStr) {

    if (!utcTimeStr || utcTimeStr === "00:00") return "TBC";

    let [h, m] = utcTimeStr.split(":").map(Number);

    h += BST_OFFSET;
    if (h >= 1 && h <= 11) h += 12;
    if (h >= 24) h -= 24;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

}
