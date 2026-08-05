import {
    getDashboard,
    getMeetings,
    getRaces,
    getRace
} from "../services/api.js";

const CHECKLIST_LABELS = {
    class: "Class",
    classChange: "Class Change",
    tripChange: "Trip Change",
    course: "Course",
    distance: "Distance",
    recentForm: "Recent Form",
    speed: "Speed",
    going: "Going",
    draw: "Draw",
    fitness: "Fitness",
    firstTimeAids: "First-time Aids",
    jockey: "Jockey",
    jockeyForm: "Jockey Form",
    trainer: "Trainer",
    weightChange: "Weight Change",
    trainerCourse: "Trainer at Course",
    jockeyCourse: "Jockey at Course",
    marketMove: "Market Move",
    winningMark: "Winning Mark"
};

const CHECKLIST_SHORT = {
    class: "Cl", classChange: "CC", tripChange: "TC", course: "Co", distance: "Di", recentForm: "RF",
    speed: "Sp", going: "Go", draw: "Dr", fitness: "Fi",
    firstTimeAids: "FT", jockey: "Jo", jockeyForm: "JF", trainer: "Tr",
    weightChange: "Wt", trainerCourse: "TCo", jockeyCourse: "JCo", marketMove: "Mkt", winningMark: "WM"
};

function drawBadgeClass(breakdown) {

    const draw = breakdown?.draw;
    if (!draw || draw.max === 0) return "runner-draw-neutral";

    if (draw.answer === "No") return "runner-draw-good";  // "No" = not inconvenienced
    if (draw.answer === "Yes") return "runner-draw-bad";  // "Yes" = inconvenienced

    return "runner-draw-neutral";

}

function drawBadgeTitle(breakdown) {

    const draw = breakdown?.draw;
    if (!draw || draw.max === 0) return "No draw bias data for this course/distance";

    return draw.evidence || (draw.answer === "No" ? "Favourable draw" : "Unfavourable draw");

}

function buildChecklistSummary(breakdown) {

    if (!breakdown) return "";

    const chips = Object.entries(breakdown)
        .filter(([, data]) => data.max > 0)
        .map(([key, data]) => {

            const short = CHECKLIST_SHORT[key] || key.slice(0, 2);
            const full = CHECKLIST_LABELS[key] || key;

            let chipClass = "checklist-chip-zero";
            if (data.points === data.max) chipClass = "checklist-chip-full";
            else if (data.points > 0) chipClass = "checklist-chip-partial";

            return "<span class=\"checklist-chip " + chipClass + "\" title=\"" + full + ": " + data.answer + "\">" + short + "</span>";

        }).join("");

    return chips ? "<div class=\"checklist-summary\">" + chips + "</div>" : "";

}

function buildTripClassBadges(breakdown) {

    if (!breakdown) return "";

    const parts = [];

    const classChange = breakdown.classChange;
    if (classChange && classChange.answer !== "N/A") {

        const cls = classChange.answer === "Down" ? "tc-mini-good"
                  : classChange.answer === "Up" ? "tc-mini-bad"
                  : "tc-mini-neutral";

        parts.push(`<span class="tc-mini ${cls}" title="Class: ${classChange.evidence || classChange.answer}">C</span>`);

    }

    const tripChange = breakdown.tripChange;
    if (tripChange && tripChange.answer !== "N/A") {

        const cls = tripChange.answer === "Down" ? "tc-mini-good"
                  : tripChange.answer === "Up" ? "tc-mini-bad"
                  : "tc-mini-neutral";

        parts.push(`<span class="tc-mini ${cls}" title="Trip: ${tripChange.evidence || tripChange.answer}">T</span>`);

    }

    return parts.join("");

}

// New: shows a small "LIVE" marker when a runner's marketMove score
// was recomputed from fresh odds at request time (raceService.js
// tags this by including "live" in the evidence string), rather than
// just reflecting this morning's static pipeline run.
function buildLiveMoveBadge(breakdown) {

    const move = breakdown?.marketMove;
    if (!move || move.answer === "N/A") return "";
    if (!move.evidence || !move.evidence.includes("live")) return "";

    const cls = move.answer === "Steamer" ? "live-move-good"
              : move.answer === "Drifter" ? "live-move-bad"
              : "live-move-neutral";

    return `<span class="live-move-badge ${cls}" title="${move.evidence}">🔴 LIVE: ${move.answer}</span>`;

}

function buildChecklistPanel(breakdown) {

    if (!breakdown) {
        return "<div class=\"checklist-panel\"><div class=\"checklist-empty\">No breakdown data available for this runner.</div></div>";
    }

    const rows = Object.entries(breakdown).map((entry) => {
        const key = entry[0];
        const data = entry[1];
        const label = CHECKLIST_LABELS[key] || key;
        const pointsText = data.max > 0 ? (data.points + "/" + data.max) : "N/A";
        const evidenceText = data.evidence ? data.evidence : (data.note ? data.note : "");
        return (
            "<div class=\"checklist-row\">" +
                "<span class=\"checklist-label\">" + label + "</span>" +
                "<span class=\"checklist-points\">" + pointsText + "</span>" +
                "<span class=\"checklist-answer\">" + data.answer + "</span>" +
                "<span class=\"checklist-evidence\">" + evidenceText + "</span>" +
            "</div>"
        );
    }).join("");

    return "<div class=\"checklist-panel\">" + rows + "</div>";

}

async function loadRace(meetingId, raceIndex, raceTime) {

    try {

        const response = await getRace(meetingId, raceIndex);

        if (!response.success)
            return;

        window.currentRaceContext = {
            meetingId,
            raceIndex,
            date: response.meeting.date,
            courseName: response.meeting.name,
            raceTime: response.race.time
        };

        document.getElementById("raceTitle").textContent =
            `${response.meeting.name} ${raceTime} - ${response.race.title}`;

        const drawAdv = response.race.drawAdvantage || "None";
        const drawAdvClass = drawAdv === "None" ? "draw-adv-neutral" : "draw-adv-active";

        document.getElementById("raceInfoBanner").innerHTML = `
            <span class="race-info-item">Class ${response.race.class ?? "-"}</span>
            <span class="race-info-dot">•</span>
            <span class="race-info-item">${response.race.distance ?? "-"}</span>
            <span class="race-info-dot">•</span>
            <span class="race-info-item ${drawAdvClass}">Draw Advantage: ${drawAdv}</span>
        `;

        const container = document.getElementById("analysis");

        container.innerHTML = "";

        if (response.race.verdict || response.race.bettingForecast) {

            const summary = document.createElement("div");
            summary.className = "race-summary";

            summary.innerHTML = `
                ${response.race.verdict
                    ? `<p class="race-summary-verdict"><strong>Analysis:</strong> ${response.race.verdict}</p>`
                    : ""}
                ${response.race.bettingForecast
                    ? `<p class="race-summary-forecast"><strong>Forecast:</strong> ${response.race.bettingForecast}</p>`
                    : ""}
            `;

            container.appendChild(summary);

        }

        // Non-runners shown separately, below the main field, rather
        // than sorted in among live contenders by rating - they're
        // no longer actually in the race.
        const allRunners = [...response.race.runners];
        const runners = allRunners.filter(r => !r.isNonRunner);
        const nonRunners = allRunners.filter(r => r.isNonRunner);

        runners.sort((a, b) => b.elite.rating - a.elite.rating);

        runners.forEach((runner, index) => {

            const medal =
                index === 0 ? "🥇" :
                index === 1 ? "🥈" :
                index === 2 ? "🥉" : "";

            const card = document.createElement("div");

            card.className = "runner-card";

			const rating = runner.elite.rating;

			let ratingClass = "rating-blue";

			if (rating >= 55)
				ratingClass = "rating-gold";
			else if (rating >= 40)
				ratingClass = "rating-green";
			else if (rating < 25)
				ratingClass = "rating-grey";

			const confidence = Math.min(runner.elite.confidence, 100);

			card.innerHTML = `

			<div class="runner-row">

				<div class="runner-left">

					<div class="runner-medal">
						${medal}
					</div>

					<div class="runner-cloth">
						${runner.official_no}
					</div>

					<div class="runner-draw ${drawBadgeClass(runner.elite.checklistBreakdown)}" title="${drawBadgeTitle(runner.elite.checklistBreakdown)}">
						${runner.draw ?? "-"}
					</div>

					<img
						class="runner-silk"
						src="${runner.silk_url}"
						alt="${runner.name}"
						onerror="this.style.display='none';"
					/>

					<div class="runner-details">

						<div class="runner-name">
							${runner.name}
							${buildLiveMoveBadge(runner.elite.checklistBreakdown)}
						</div>

						<div class="runner-meta">

							T: ${runner.trainer}

							&nbsp;•&nbsp;

							J: ${runner.jockey}

							&nbsp;•&nbsp;

							Form ${runner.formsummary}

							&nbsp;•&nbsp;

							Draw ${runner.draw}

							&nbsp;•&nbsp;

							Wt ${runner.weight}

							${buildTripClassBadges(runner.elite.checklistBreakdown)}

						</div>

						<div class="confidence-bar">

							<div
								class="confidence-fill"
								style="width:${confidence}%">
							</div>

						</div>

						<div class="confidence-text">

							Confidence ${confidence.toFixed(1)}%

						</div>

						${buildChecklistSummary(runner.elite.checklistBreakdown)}

					</div>

				</div>

				<div class="runner-right">

					<div class="rating-label">
						ELITE
					</div>

					<div class="rating ${ratingClass}">
						${rating.toFixed(1)}
					</div>

					<button class="checklist-toggle" type="button">
						Show working ▾
					</button>

				</div>

			</div>

			${buildChecklistPanel(runner.elite.checklistBreakdown)}

			`;

			const toggleBtn = card.querySelector(".checklist-toggle");
			const panel = card.querySelector(".checklist-panel");

			if (toggleBtn && panel) {

				toggleBtn.addEventListener("click", () => {

					const isOpen = panel.classList.toggle("open");
					toggleBtn.textContent = isOpen ? "Hide working ▴" : "Show working ▾";

				});

			}

            container.appendChild(card);

        });

        // Non-runners: shown clearly, but visually deprioritised -
        // never hide real information, just make it obvious they're
        // no longer in contention.
        if (nonRunners.length) {

            const nrHeader = document.createElement("div");
            nrHeader.className = "non-runners-header";
            nrHeader.textContent = `Non-Runners (${nonRunners.length})`;
            container.appendChild(nrHeader);

            nonRunners.forEach(runner => {

                const nrCard = document.createElement("div");
                nrCard.className = "runner-card runner-card-nonrunner";

                nrCard.innerHTML = `
                    <div class="runner-row">
                        <div class="runner-left">
                            <div class="runner-cloth">${runner.official_no}</div>
                            <div class="runner-details">
                                <div class="runner-name">${runner.name}</div>
                                <div class="runner-meta">
                                    T: ${runner.trainer} &nbsp;•&nbsp; J: ${runner.jockey}
                                </div>
                            </div>
                        </div>
                        <div class="runner-right">
                            <span class="non-runner-badge">NON-RUNNER</span>
                        </div>
                    </div>
                `;

                container.appendChild(nrCard);

            });

        }

    }
    catch (err) {

        console.error(err);

    }

}

async function loadRaces(meetingId, meetingName) {

    try {

        document.getElementById("meetingTitle").textContent =
            `${meetingName} Races`;

        const response = await getRaces(meetingId);

        if (!response.success)
            return;

        const container = document.getElementById("races");

        container.innerHTML = "";

		response.races.forEach(race => {

			const card = document.createElement("div");

			card.className = "race-card";

			card.innerHTML = `
				<span class="race-card-time">${toLocalTimeString(race.time)}</span>
				<span class="race-card-meta">Class ${race.class} • ${race.distance}</span>
				<span class="race-card-runners">${race.runners} runners</span>
			`;

			card.addEventListener("click", () => {

				container.querySelectorAll(".race-card")
					.forEach(el => el.classList.remove("active"));

				card.classList.add("active");

				loadRace(meetingId, race.index, toLocalTimeString(race.time));

			});

			container.appendChild(card);

		});

    }
    catch (err) {

        console.error(err);

    }

}

export async function loadDashboard() {

    try {

        const response = await getDashboard();

        console.log(response);

        if (!response.success) {
            throw new Error("Dashboard request failed.");
        }

		const dashboard = response.dashboard;
		const best = dashboard.bestOpportunity;

		const napEl = document.getElementById("napCallout");

		if (dashboard.nap && dashboard.nap.active) {

			napEl.style.display = "";

			napEl.innerHTML = `
				<span class="nap-label">Today's Nap</span>
				<div class="nap-name">${dashboard.nap.name}</div>
				<div class="nap-meta">
					${dashboard.nap.meeting} • ${dashboard.nap.time}
					${dashboard.nap.strength ? ` • ${dashboard.nap.strength}` : ""}
				</div>
			`;

		} else {

			napEl.style.display = "none";

		}

		if (!best) {

			document.getElementById("bestHorse").textContent = "No selections";
			document.getElementById("bestRating").textContent = "ELITE --";
			document.getElementById("bestConfidence").textContent = "Confidence --%";

			return;
		}

        document.getElementById("bestHorse").textContent = best.horse ?? "-";
        document.getElementById("bestRating").textContent = best.rating != null ? `ELITE ${best.rating}` : "-";
        document.getElementById("bestConfidence").textContent = best.confidence != null ? `Confidence ${best.confidence}%` : "--%";
		document.getElementById("bestCourse").textContent = best.course ?? "-";
		document.getElementById("bestRaceTime").textContent = best.raceTime ? toLocalTimeString(best.raceTime) : "-";
		const silk = document.getElementById("bestSilk");

		if (best.silkUrl) {
			silk.src = best.silkUrl;
			silk.style.display = "";
		} else {
			silk.style.display = "none";
		}

		const heroBadge = document.getElementById("heroBadge");

		if (best.meetingId != null && best.raceIndex != null) {

			heroBadge.style.cursor = "pointer";

			const goToBestRace = async () => {
				await loadRaces(best.meetingId, best.course);
				await loadRace(best.meetingId, best.raceIndex, toLocalTimeString(best.raceTime));
			};

			heroBadge.onclick = async () => {
				await goToBestRace();
				document.getElementById("analysisSection")
					.scrollIntoView({ behavior: "smooth", block: "start" });
			};

			// Show real content immediately on page load instead of an
			// empty "Select a Meeting" placeholder - no click required.
			goToBestRace();

		}
		
		// Build the global race-time list clock.js needs for the
		// "next race across all courses" countdown. race.time from the
		// API is UTC (matches how the scraper stores it) - apply the
		// same BST-aware conversion used elsewhere on the site so this
		// lines up correctly with getLondonTime()'s local totalSecs.
		if (dashboard.raceTimes && typeof getLondonTime === "function") {

			window.allRaceTimes = dashboard.raceTimes.map(r => {

				let [h, m] = r.time.split(":").map(Number);

				h += BST_OFFSET;
				if (h >= 1 && h <= 11) h += 12;
				if (h >= 24) h -= 24;

				return {
					course: r.course,
					displayTime: toLocalTimeString(r.time),
					totalSecs: (h * 3600) + (m * 60)
				};

			}).sort((a, b) => a.totalSecs - b.totalSecs);

			if (!window.timerPool?.liveClock) {
				window.timerPool ??= {};
				window.timerPool.liveClock = setInterval(updateClock, 1000);
				updateClock();
			}

		}

		await loadMeetings();
		loadTodaysResults();
		setInterval(loadTodaysResults, 300000);

    }
    catch (err) {

        console.error(err);

    }

}

async function loadTodaysResults() {

    try {

        const response = await fetch("/api/checkResults");
        const data = await response.json();

        const strip = document.getElementById("todaysResultsStrip");
        if (!strip) return;

        // Nothing checked yet (too early in the day, or Redis not
        // configured locally) - stay hidden rather than show an empty box.
        if (!data.success || !data.racesChecked) {
            strip.style.display = "none";
            return;
        }

        const winRate = ((data.topPickWins / data.racesChecked) * 100).toFixed(1);
        const placeRate = ((data.topPickPlaces / data.racesChecked) * 100).toFixed(1);

        const recentDetails = (data.details || []).slice(-5).reverse();

        strip.innerHTML = `
            <div class="results-strip-summary">
                <span class="results-strip-label">Today's Results (Live)</span>
                <span class="results-strip-stat">${data.racesChecked} races checked</span>
                <span class="results-strip-stat results-strip-win">${data.topPickWins} won (${winRate}%)</span>
                <span class="results-strip-stat results-strip-place">${data.topPickPlaces} placed (${placeRate}%)</span>
            </div>
            ${recentDetails.length ? `
                <div class="results-strip-recent">
                    ${recentDetails.map(d => `
                        <span class="results-strip-race results-strip-${d.outcome}">
                            ${d.course} ${toLocalTimeString(d.time)} - ${d.ourPick} (${d.outcome})
                        </span>
                    `).join("")}
                </div>
            ` : ""}
        `;

        strip.style.display = "";

    }
    catch (err) {
        console.error(err);
    }

}

async function loadMeetings() {

    try {

        const response = await getMeetings();

        if (!response.success)
            return;

        const container = document.getElementById("meetings");

        container.innerHTML = "";

        response.meetings.forEach(meeting => {

            const card = document.createElement("div");

            card.className = "meeting-card";
            card.dataset.meetingId = meeting.id;

			card.innerHTML = `
				<span class="meeting-card-name">${meeting.name}</span>
				<span class="meeting-card-count">${meeting.raceCount}</span>
			`;

			card.addEventListener("click", () => {

				container.querySelectorAll(".meeting-card")
					.forEach(el => el.classList.remove("active"));

				card.classList.add("active");

				loadRaces(meeting.id, meeting.name);

			});

			container.appendChild(card);

        });

    }
    catch (err) {

        console.error(err);

    }

}