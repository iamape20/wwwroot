// dashboard.js - Refined Mathematical & UI Implementation

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
    winningMark: "Winning Mark",
    runningStyle: "Running Style",
    beatenFavourite: "Beaten Favourite",
    bounceProfile: "Bounce Profile"
};

const CHECKLIST_SHORT = {
    class: "Cl", classChange: "CC", tripChange: "TC", course: "Co", distance: "Di", recentForm: "RF",
    speed: "Sp", going: "Go", draw: "Dr", fitness: "Fi",
    firstTimeAids: "FT", jockey: "Jo", jockeyForm: "JF", trainer: "Tr",
    weightChange: "Wt", trainerCourse: "TCo", jockeyCourse: "JCo", marketMove: "Mkt", winningMark: "WM",
    runningStyle: "RS", beatenFavourite: "BF", bounceProfile: "BP"
};

// --- Security & Formatting Helpers ---

function escapeHtml(str) {
    if (typeof str !== "string") return str ?? "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function parseLondonTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    if (parts.length < 2) return 0;
    
    let hours = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);

    // Convert UTC/API race time to London Local Time safely without hardcoded BST constants
    const now = new Date();
    const isBST = Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", timeZoneName: "short" })
        .format(now)
        .includes("BST");

    if (isBST) hours = (hours + 1) % 24;
    return (hours * 3600) + (mins * 60);
}

// --- Race confidence tier ---
//
// Mirrors js/marginTiers.js. Kept as a small standalone copy because
// this file is deployed to Vercel and cannot require from the local
// pipeline - the same deliberate, narrow duplication already used for
// parseFractionalOdds in backend/services/liveScoring.js. If the cuts
// change there, change them here too.
//
// Measured on 3,955 reconstructed races, restricted to fields of 5+,
// edge over a blind pick by tier: Strong +20.2pp, Moderate +14.8pp,
// Open +6.4pp. The margin between the top two predicts; the absolute
// rating does not (picks rated under 30 won as often as picks rated
// 75+), which is why this is worth showing alongside the number.
const TIER_STRONG_CUT = 0.50;
const TIER_MODERATE_CUT = 0.30;
const TIER_MIN_FIELD_FOR_STRONG = 5;
const TIER_MIN_ABSOLUTE_MARGIN = 1.0;

// `runners` must already be sorted best-first - this never re-sorts,
// so it cannot disagree with the order actually being displayed.
function raceMarginTier(runners) {

    const ratings = (runners || [])
        .map(r => r?.elite?.rating)
        .filter(v => typeof v === "number");

    if (ratings.length < 2) return null;

    const top = ratings[0];
    const margin = top - ratings[1];
    const spread = top - ratings[ratings.length - 1];

    if (spread <= 0) return { tier: "Open", margin, relativeMargin: 0 };

    // With two runners the second IS the last, so margin/spread would
    // always be 1 and every match race would read Strong.
    const relativeMargin = ratings.length >= 3
        ? margin / spread
        : (top > 0 ? margin / top : 0);

    // A ratio breaks down when its denominator is tiny: in a bunched
    // field a meaningless 0.5-point gap can be half the total spread.
    if (margin < TIER_MIN_ABSOLUTE_MARGIN) {
        return { tier: "Open", margin, relativeMargin };
    }

    const tier = (relativeMargin >= TIER_STRONG_CUT && ratings.length >= TIER_MIN_FIELD_FOR_STRONG)
        ? "Strong"
        : relativeMargin >= TIER_MODERATE_CUT ? "Moderate"
        : "Open";

    return { tier, margin, relativeMargin };

}

// --- Badge & Display Builders ---

function drawBadgeClass(breakdown) {
    const draw = breakdown?.draw;
    if (!draw || draw.max === 0) return "runner-draw-neutral";
    if (draw.answer === "No") return "runner-draw-good";
    if (draw.answer === "Yes") return "runner-draw-bad";
    return "runner-draw-neutral";
}

function drawBadgeTitle(breakdown) {
    const draw = breakdown?.draw;
    if (!draw || draw.max === 0) return "No draw bias data for this course/distance";
    return escapeHtml(draw.evidence || (draw.answer === "No" ? "Favourable draw" : "Unfavourable draw"));
}

function buildChecklistSummary(breakdown) {
    if (!breakdown) return "";

    const chips = Object.entries(breakdown)
        .filter(([, data]) => data.max > 0)
        .map(([key, data]) => {
            const short = CHECKLIST_SHORT[key] || key.slice(0, 2);
            const full = CHECKLIST_LABELS[key] || key;

            let chipClass = "checklist-chip-zero";
            if (data.points === data.max) {
                // A genuinely high-value contributor (2+ points
                // earned) stands out more than a fully-earned but
                // small one (0.25-1 points) - with 20+ categories now,
                // "did it score" alone isn't enough to tell the
                // categories that actually moved the rating from the
                // ones that barely nudged it.
                chipClass = data.points >= 2 ? "checklist-chip-high-impact" : "checklist-chip-full";
            } else if (data.points > 0) {
                chipClass = "checklist-chip-partial";
            }

            return `<span class="checklist-chip ${chipClass}" title="${escapeHtml(full)}: ${escapeHtml(data.answer)}">${short}</span>`;
        }).join("");

    return chips ? `<div class="checklist-summary">${chips}</div>` : "";
}

function buildTripClassBadges(breakdown) {
    if (!breakdown) return "";
    const parts = [];

    const classChange = breakdown.classChange;
    if (classChange && classChange.answer !== "N/A") {
        const cls = classChange.answer === "Down" ? "tc-mini-good"
                  : classChange.answer === "Up" ? "tc-mini-bad"
                  : "tc-mini-neutral";

        parts.push(`<span class="tc-mini ${cls}" title="Class: ${escapeHtml(classChange.evidence || classChange.answer)}">C</span>`);
    }

    const tripChange = breakdown.tripChange;
    if (tripChange && tripChange.answer !== "N/A") {
        const cls = tripChange.answer === "Down" ? "tc-mini-good"
                  : tripChange.answer === "Up" ? "tc-mini-bad"
                  : "tc-mini-neutral";

        parts.push(`<span class="tc-mini ${cls}" title="Trip: ${escapeHtml(tripChange.evidence || tripChange.answer)}">T</span>`);
    }

    return parts.join("");
}

// Shows the current price whenever real snapshot data exists,
// regardless of whether a live re-score specifically fired -
// separate from buildLiveMoveBadge, which only shows for the
// "🔴 LIVE" recomputed case specifically. UK convention: a
// shortening price (steamer) is shown green with a down arrow,
// a drifting price (lengthening) shown red with an up arrow.
function buildPriceBadge(breakdown) {

    const move = breakdown?.marketMove;
    if (!move || move.answer === "N/A" || !move.evidence) return "";

    const parts = move.evidence.split(" → ");
    if (parts.length < 2) return "";

    const latestPrice = parts[1].split(" (")[0].trim();
    if (!latestPrice) return "";

    const cls = move.answer === "Steamer" ? "price-badge-in"
              : move.answer === "Drifter" ? "price-badge-out"
              : "price-badge-steady";

    const arrow = move.answer === "Steamer" ? "▼"
                : move.answer === "Drifter" ? "▲"
                : "–";

    return `<span class="price-badge ${cls}" title="${escapeHtml(move.evidence)}">${arrow} ${escapeHtml(latestPrice)}</span>`;
}

function buildLiveMoveBadge(breakdown) {
    const move = breakdown?.marketMove;
    if (!move || move.answer === "N/A") return "";
    if (!move.evidence || !move.evidence.includes("live")) return "";

    const cls = move.answer === "Steamer" ? "live-move-good"
              : move.answer === "Drifter" ? "live-move-bad"
              : "live-move-neutral";

    return `<span class="live-move-badge ${cls}" title="${escapeHtml(move.evidence)}">🔴 LIVE: ${escapeHtml(move.answer)}</span>`;
}

// Only shown when the horse genuinely qualifies - currently rated
// below the mark it has already proven capable of winning off. A
// real, well-treated signal, not just "no data" or "not well-treated".
function buildWinningMarkBadge(breakdown) {
    const wm = breakdown?.winningMark;
    if (!wm || wm.answer !== "Yes") return "";

    return `<span class="winning-mark-badge" title="${escapeHtml(wm.evidence || "")}">⬇ WELL TREATED</span>`;
}

function buildChecklistPanel(breakdown) {
    if (!breakdown) {
        return `<div class="checklist-panel"><div class="checklist-empty">No breakdown data available for this runner.</div></div>`;
    }

    const rows = Object.entries(breakdown).map(([key, data]) => {
        const label = CHECKLIST_LABELS[key] || key;
        const pointsText = data.max > 0 ? `${data.points}/${data.max}` : "N/A";
        const evidenceText = data.evidence ? data.evidence : (data.note ? data.note : "");
        return (
            `<div class="checklist-row">` +
                `<span class="checklist-label">${escapeHtml(label)}</span>` +
                `<span class="checklist-points">${escapeHtml(pointsText)}</span>` +
                `<span class="checklist-answer">${escapeHtml(data.answer)}</span>` +
                `<span class="checklist-evidence">${escapeHtml(evidenceText)}</span>` +
            `</div>`
        );
    }).join("");

    return `<div class="checklist-panel">${rows}</div>`;
}

function highlightSelectedHorses(text, verdictText, runners) {
    if (!text || !verdictText || !runners?.length) return escapeHtml(text);

    const tail = verdictText.slice(-120).toUpperCase();

    const selected = runners
        .filter(r => tail.includes(String(r.name || "").toUpperCase()))
        .map(r => r.name);

    let result = escapeHtml(text);
    if (!selected.length) return result;

    const sorted = [...selected].sort((a, b) => b.length - a.length);

    for (const name of sorted) {
        const escapedName = escapeHtml(name);
        const escapedPattern = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`(${escapedPattern})`, "gi");
        result = result.replace(pattern, '<span class="analysis-highlight">$1</span>');
    }

    return result;
}

// --- Core Data Loading Functions ---

async function loadRace(meetingId, raceIndex, raceTime) {
    try {
        const container = document.getElementById("analysis");
        if (container) {
            container.innerHTML = `<div class="race-loading">Loading race data...</div>`;
        }

        const response = await getRace(meetingId, raceIndex);
        if (!response.success) return;

        window.currentRaceContext = {
            meetingId,
            raceIndex,
            date: response.meeting.date,
            courseName: response.meeting.name,
            raceTime: response.race.time
        };

        document.getElementById("raceTitle").textContent =
            `${response.meeting.name} ${raceTime} - ${response.race.title}`;

        // Split and sort BEFORE the info banner is built, so the banner
        // can carry the race's confidence tier. Ratings come straight
        // from the backend - nothing is recalculated here.
        const allRunners = [...response.race.runners];
        const runners = allRunners.filter(r => !r.isNonRunner);
        const nonRunners = allRunners.filter(r => r.isNonRunner);

        runners.sort((a, b) => b.elite.rating - a.elite.rating);

        const marginTier = raceMarginTier(runners);

        const drawAdv = response.race.drawAdvantage || "None";
        const drawAdvClass = drawAdv === "None" ? "draw-adv-neutral" : "draw-adv-active";

        const tierLabel = marginTier
            ? `<span class="race-info-dot">•</span>` +
              `<span class="race-info-item tier-${marginTier.tier.toLowerCase()}" ` +
              `title="How far clear our top pick is, relative to the spread across this field">` +
              `${marginTier.tier} pick${marginTier.margin > 0 ? ` (+${marginTier.margin.toFixed(1)} clear)` : ""}</span>`
            : "";

        // Dim the ELITE badges when the race is Open - the model has no
        // strong opinion here, so the numbers should not look as
        // confident as they do in a race it can call.
        const analysisSection = document.getElementById("analysisSection");
        if (analysisSection) {
            analysisSection.classList.toggle("race-open", marginTier?.tier === "Open");
        }

        document.getElementById("raceInfoBanner").innerHTML = `
            <span class="race-info-item">Class ${escapeHtml(response.race.class ?? "-")}</span>
            <span class="race-info-dot">•</span>
            <span class="race-info-item">${escapeHtml(response.race.distance ?? "-")}</span>
            <span class="race-info-dot">•</span>
            <span class="race-info-item ${drawAdvClass}">Draw Advantage: ${escapeHtml(drawAdv)}</span>
            ${tierLabel}
        `;

        container.innerHTML = "";

        if (response.race.verdict || response.race.bettingForecast) {
            const summary = document.createElement("div");
            summary.className = "race-summary";

            summary.innerHTML = `
                ${response.race.verdict
                    ? `<p class="race-summary-verdict"><strong>SportingLife:</strong> ${highlightSelectedHorses(response.race.verdict, response.race.verdict, response.race.runners)}</p>`
                    : ""}
                ${response.race.bettingForecast
                    ? `<p class="race-summary-forecast"><strong>Forecast:</strong> ${highlightSelectedHorses(response.race.bettingForecast, response.race.verdict, response.race.runners)}</p>`
                    : ""}
            `;

            container.appendChild(summary);
        }

        const runnerFragment = document.createDocumentFragment();

        runners.forEach((runner, index) => {
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
            const card = document.createElement("div");
            card.className = "runner-card";

            const rating = runner.elite.rating;

            let ratingClass = "rating-blue";
            if (rating >= 55) ratingClass = "rating-gold";
            else if (rating >= 40) ratingClass = "rating-green";
            else if (rating < 25) ratingClass = "rating-grey";

            const confidence = Math.min(runner.elite.confidence, 100);

            card.innerHTML = `
            <div class="runner-row">
                <div class="runner-left">
                    <div class="runner-medal">${medal}</div>
                    <div class="runner-cloth">${escapeHtml(runner.official_no)}</div>
                    <div class="runner-draw ${drawBadgeClass(runner.elite.checklistBreakdown)}" title="${drawBadgeTitle(runner.elite.checklistBreakdown)}">
                        ${escapeHtml(runner.draw ?? "-")}
                    </div>
                    <img class="runner-silk" src="${escapeHtml(runner.silk_url)}" alt="${escapeHtml(runner.name)}" onerror="this.style.display='none';" />
                    <div class="runner-details">
                        <div class="runner-name">
                            ${escapeHtml(runner.name)}
                            ${buildPriceBadge(runner.elite.checklistBreakdown)}
                            ${buildLiveMoveBadge(runner.elite.checklistBreakdown)}
							${buildWinningMarkBadge(runner.elite.checklistBreakdown)}
                        </div>
                        <div class="runner-meta">
                            T: ${escapeHtml(runner.trainer)} &nbsp;•&nbsp; J: ${escapeHtml(runner.jockey)} &nbsp;•&nbsp; Form ${escapeHtml(runner.formsummary)} &nbsp;•&nbsp; Draw ${escapeHtml(runner.draw)} &nbsp;•&nbsp; Wt ${escapeHtml(runner.weight)}
                            ${buildTripClassBadges(runner.elite.checklistBreakdown)}
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width:${confidence}%"></div>
                        </div>
                        <div class="confidence-text">Confidence ${confidence.toFixed(1)}%</div>
                        ${buildChecklistSummary(runner.elite.checklistBreakdown)}
                    </div>
                </div>
                <div class="runner-right">
                    <div class="rating-label">ELITE</div>
                    <div class="rating ${ratingClass}">${rating.toFixed(1)}</div>
                    <button class="checklist-toggle" type="button">Show working ▾</button>
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

            runnerFragment.appendChild(card);
        });

        container.appendChild(runnerFragment);

        // Non-runners formatting: Visual deprioritisation using CSS opacity and grayscale
        if (nonRunners.length) {
            const nrFragment = document.createDocumentFragment();

            const nrHeader = document.createElement("div");
            nrHeader.className = "non-runners-header";
            nrHeader.textContent = `Non-Runners (${nonRunners.length})`;
            nrFragment.appendChild(nrHeader);

            nonRunners.forEach(runner => {
                const nrCard = document.createElement("div");
                nrCard.className = "runner-card runner-card-nonrunner";
                nrCard.style.opacity = "0.65";
                nrCard.style.filter = "grayscale(80%)";

                nrCard.innerHTML = `
                    <div class="runner-row">
                        <div class="runner-left">
                            <div class="runner-cloth">${escapeHtml(runner.official_no)}</div>
                            <div class="runner-details">
                                <div class="runner-name">${escapeHtml(runner.name)}</div>
                                <div class="runner-meta">
                                    T: ${escapeHtml(runner.trainer)} &nbsp;•&nbsp; J: ${escapeHtml(runner.jockey)}
                                </div>
                            </div>
                        </div>
                        <div class="runner-right">
                            <span class="non-runner-badge">NON-RUNNER</span>
                        </div>
                    </div>
                `;

                nrFragment.appendChild(nrCard);
            });

            container.appendChild(nrFragment);
        }
    } catch (err) {
        console.error("Error loading race:", err);
    }
}

async function loadRaces(meetingId, meetingName, autoSelectFirst = true) {
    try {
        document.getElementById("meetingTitle").textContent = `${meetingName} Races`;
        const response = await getRaces(meetingId);
        if (!response.success) return;

        const container = document.getElementById("races");
        container.innerHTML = "";

        let firstCard = null;

        response.races.forEach((race, index) => {
            const card = document.createElement("div");
            card.className = "race-card";

            card.innerHTML = `
                <span class="race-card-time">${escapeHtml(toLocalTimeString(race.time))}</span>
                <span class="race-card-meta">Class ${escapeHtml(race.class)} • ${escapeHtml(race.distance)}</span>
                <span class="race-card-runners">${escapeHtml(race.runners)} runners</span>
            `;

            card.addEventListener("click", () => {
                container.querySelectorAll(".race-card").forEach(el => el.classList.remove("active"));
                card.classList.add("active");
                loadRace(meetingId, race.index, toLocalTimeString(race.time));
            });

            if (index === 0) firstCard = { card, race };

            container.appendChild(card);
        });

        // Default straight into the first race of the day, same as
        // a manual click - one less step after picking a course.
        // Skipped when the caller (e.g. the hero badge) is about to
        // load a specific race of its own anyway.
        if (firstCard && autoSelectFirst) {
            firstCard.card.classList.add("active");
            loadRace(meetingId, firstCard.race.index, toLocalTimeString(firstCard.race.time));
        }
    } catch (err) {
        console.error("Error loading races:", err);
    }
}

export async function loadDashboard() {
    try {
        const response = await getDashboard();
        if (!response.success) {
            throw new Error("Dashboard request failed.");
        }

        const dashboard = response.dashboard;
        const nap = dashboard.nap && dashboard.nap.active ? dashboard.nap : null;
        const standout = dashboard.nap && dashboard.nap.standout ? dashboard.nap.standout : null;
        const best = dashboard.bestOpportunity;

		const liveDayEl =
			document.getElementById("live-day");

		const cardDate =
			dashboard?.date ||
			dashboard?.meetingDate ||
			dashboard?.meetings?.[0]?.date;

		if (liveDayEl && cardDate) {

			const date =
				new Date(`${cardDate}T12:00:00`);

			if (!Number.isNaN(date.getTime())) {

				liveDayEl.textContent =
					new Intl.DateTimeFormat(
						"en-GB",
						{
							weekday: "long",
							day: "numeric",
							month: "long",
							year: "numeric",
							timeZone: "Europe/London"
						}
					).format(date);

			}

		}

        const fallback = standout ? {
            horse: standout.name,
            rating: standout.rating,
            course: standout.meeting,
            raceTime: standout.time,
            silkUrl: standout.silk_url,
            meetingId: standout.meetingId,
            raceIndex: standout.raceIndex,
            tier: standout.tier,
            gap: standout.gap,
            isStandout: true,
            isUnexposed: standout.isUnexposed
        } : best;

        const hero = nap ? {
            horse: nap.name,
            rating: nap.rating,
            course: nap.meeting,
            raceTime: nap.time,
            silkUrl: nap.silk_url,
            meetingId: nap.meetingId,
            raceIndex: nap.raceIndex,
            tier: nap.tier,
            gap: nap.gap,
            isNap: true
        } : fallback;

        // The old standalone Nap callout is now redundant - the hero
        // IS the Nap. Hidden rather than deleted so the markup can stay
        // as it is.
        const napEl = document.getElementById("napCallout");
        if (napEl) napEl.style.display = "none";

        if (!hero) {
            document.getElementById("bestHorse").textContent = "No selections";
            document.getElementById("bestRating").textContent = "EPR --";
            document.getElementById("bestConfidence").textContent = "No qualified pick today";
            return;
        }

        document.getElementById("bestHorse").textContent = hero.horse ?? "-";
        document.getElementById("bestRating").textContent = hero.rating != null ? `EPR ${hero.rating}` : "-";

        // Second line shows the tier and margin - the measured signal -
        // rather than the confidence percentage, which has never been
        // validated as predictive.
        const subEl = document.getElementById("bestConfidence");
        if (hero.isNap) {
            const gapText = typeof hero.gap === "number" && hero.gap > 0 ? ` • +${hero.gap.toFixed(1)} clear` : "";
            subEl.textContent = `${hero.tier ?? "Nap"} pick${gapText}`;
            subEl.className = `tier-${String(hero.tier ?? "open").toLowerCase()}`;
        } else if (hero.isStandout) {
            const gapText = typeof hero.gap === "number" && hero.gap > 0 ? ` • +${hero.gap.toFixed(1)} clear` : "";
            const caveat = hero.isUnexposed ? " (unexposed)" : "";
            subEl.textContent = `Biggest separation${gapText}${caveat}`;
            subEl.className = `tier-${String(hero.tier ?? "open").toLowerCase()}`;
        } else {
            subEl.textContent = "Top rated - no qualified Nap today";
            subEl.className = "tier-open";
        }

        document.getElementById("bestCourse").textContent = hero.course ?? "-";
        document.getElementById("bestRaceTime").textContent = hero.raceTime ? toLocalTimeString(hero.raceTime) : "-";

        const silk = document.getElementById("bestSilk");
        if (hero.silkUrl) {
            silk.src = hero.silkUrl;
            silk.style.display = "";
        } else {
            silk.style.display = "none";
        }

        const heroBadge = document.getElementById("heroBadge");
        if (hero.meetingId != null && hero.raceIndex != null) {
            heroBadge.style.cursor = "pointer";

            const goToHeroRace = async () => {
                await loadRaces(hero.meetingId, hero.course, false);
                await loadRace(hero.meetingId, hero.raceIndex, toLocalTimeString(hero.raceTime));
            };

            heroBadge.onclick = async () => {
                await goToHeroRace();
                document.getElementById("analysisSection").scrollIntoView({ behavior: "smooth", block: "start" });
            };

            goToHeroRace();
        }

        if (dashboard.raceTimes) {
            window.allRaceTimes = dashboard.raceTimes.map(r => ({
                course: r.course,
                displayTime: toLocalTimeString(r.time),
                totalSecs: parseLondonTimeToSeconds(r.time)
            })).sort((a, b) => a.totalSecs - b.totalSecs);

            if (!window.timerPool?.liveClock && typeof updateClock === "function") {
                window.timerPool ??= {};
                window.timerPool.liveClock = setInterval(updateClock, 1000);
                updateClock();
            }
        }

        await loadMeetings();
        loadTodaysResults();
        setInterval(loadTodaysResults, 300000);
    } catch (err) {
        console.error("Error loading dashboard:", err);
    }
}

async function loadTodaysResults() {
    try {
        const response = await fetch("/api/checkResults");

        const strip = document.getElementById("todaysResultsStrip");
        if (!strip) return;

        if (!response.ok) {
            // Endpoint not available (e.g. missing locally) or a
            // genuine server error - stay hidden rather than throw
            // trying to parse whatever non-JSON response came back.
            strip.style.display = "none";
            return;
        }

        const data = await response.json();

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
                        <span class="results-strip-race results-strip-${escapeHtml(d.outcome)}">
                            ${escapeHtml(d.course)} ${escapeHtml(toLocalTimeString(d.time))} - ${escapeHtml(d.ourPick)} (${escapeHtml(d.outcome)})${d.outcome !== "won" && d.actualWinner ? ` &nbsp;→&nbsp; Winner: ${escapeHtml(d.actualWinner)}` : ""}
                        </span>
                    `).join("")}
                </div>
            ` : ""}
        `;

        strip.style.display = "";
    } catch (err) {
        console.error("Error loading today's results:", err);
    }
}

async function loadMeetings() {
    try {
        const response = await getMeetings();
        if (!response.success) return;

        const container = document.getElementById("meetings");
        container.innerHTML = "";

        response.meetings.forEach(meeting => {
            const card = document.createElement("div");
            card.className = "meeting-card";
            card.dataset.meetingId = meeting.id;

            card.innerHTML = `
                <span class="meeting-card-name">${escapeHtml(meeting.name)}</span>
                <span class="meeting-card-count">${escapeHtml(meeting.raceCount)}</span>
            `;

            card.addEventListener("click", () => {
                container.querySelectorAll(".meeting-card").forEach(el => el.classList.remove("active"));
                card.classList.add("active");
                loadRaces(meeting.id, meeting.name);
            });

            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading meetings:", err);
    }
}