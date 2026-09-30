/*
==========================================================
 Elite Power Ratings
 File : js/clock.js
 Version : 1.0.0
==========================================================
*/

// Fixed to the UK's actual Europe/London daylight-saving state, not the
// visitor's own device timezone - the old version compared the device's
// getTimezoneOffset() against its January value, which answers "does
// wherever this browser thinks it is observe DST", not "is it BST right
// now in London" - wrong for any visitor whose device isn't set to a UK
// timezone (or a region with different DST dates). Matches the technique
// dashboard.js's parseLondonTimeToSeconds already uses correctly. Not
// cached, so it can't go stale if a tab is left open across a DST
// transition.
const isBST = () => Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    timeZoneName: "short"
}).format(new Date()).includes("BST");

// Converts a raw UTC time string (how the scraper stores race times,
// e.g. "13:35") into the correct local BST-aware display time
// (e.g. "14:35"). Used throughout dashboard.js wherever a race time
// is shown to the user. Guards against the "00:00" placeholder used
// for missing/unknown times.
// Card times are 24-hour UTC ("13:35"). Converted with the real
// Europe/London rules for today's date, so GMT and BST are both right.
// Replaces an older "add 12 to hours 1-11" guess (it assumed every race
// was in the afternoon), which would have shown winter races before noon
// - e.g. 11:40 GMT - as 23:40 once the clocks go back (found 2026-09-30).
function utcTimeToLondon(utcTimeStr) {

    const [h, m] = String(utcTimeStr || "").split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

    const now = new Date();
    const instant = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m));

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(instant);

    const hh = Number(parts.find(p => p.type === "hour")?.value) % 24;
    const mm = Number(parts.find(p => p.type === "minute")?.value);

    return { h: hh, m: mm };

}

function toLocalTimeString(utcTimeStr) {

    if (!utcTimeStr || utcTimeStr === "00:00") return "TBC";

    const t = utcTimeToLondon(utcTimeStr);
    if (!t) return "TBC";

    return `${String(t.h).padStart(2, "0")}:${String(t.m).padStart(2, "0")}`;

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

			if (mins < 5) {
				display.style.background = "rgba(220, 38, 38, 0.15)";
				display.style.borderColor = "#DC2626";
				display.style.color = "#DC2626";
			} else {
				display.style.background = "rgba(212, 175, 55, 0.15)";
				display.style.borderColor = "#D4AF37";
				display.style.color = "#D4AF37";
			}

			// MOVED HERE - was outside the if(next){...} block, would throw on
			// "ALL RACES FINISHED" when next is undefined
			if (next.meetingId && next.raceIndex != null && typeof loadRace === "function") {

				display.style.cursor = "pointer";

				display.onclick = async () => {

					await loadRace(
						next.meetingId,
						next.raceIndex,
						next.displayTime
					);

					document.getElementById("analysisSection")
						?.scrollIntoView({ behavior: "smooth", block: "start" });

				};

			} else {

				display.style.cursor = "default";
				display.onclick = null;

			}

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
        const t = utcTimeToLondon(ctx.raceTime);
        if (!t) return;

        const targetSecs = (t.h * 3600) + (t.m * 60);
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