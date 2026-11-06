// dashboard.js - Refined Mathematical & UI Implementation

// ?v= must match index.html's cache-busting version - see the
// comment there.
import {
    getDashboard,
    getMeetings,
    getRaces,
    getRace
} from "../services/api.js?v=20261105a";

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
    bounceProfile: "Bounce Profile",
    jockeyTrainerCombo: "Jockey/Trainer Combo",
    jockeyOnDebutant: "Jockey on Debutant"
};

const CHECKLIST_SHORT = {
    class: "Cl",
    classChange: "CC",
    tripChange: "TC",
    course: "Co",
    distance: "Di",
    recentForm: "RF",
    speed: "Sp",
    going: "Go",
    draw: "Dr",
    fitness: "Fi",
    firstTimeAids: "FT",
    jockey: "Jo",
    jockeyForm: "JF",
    trainer: "Tr",
    weightChange: "Wt",
    trainerCourse: "TCo",
    jockeyCourse: "JCo",
    marketMove: "Mkt",
    winningMark: "WM",
    runningStyle: "RS",
    beatenFavourite: "BF",
    bounceProfile: "BP",
    jockeyTrainerCombo: "JTC",
    jockeyOnDebutant: "JOD"
};


// A 09:00 leg the market has since moved away from (2026-10-22): the race
// page's Our Pick is now another horse, or the race has dropped to Open (VOID
// BET). Both pages then say "no bet" instead of the home page recommending
// one horse while the race page picks another. Display only - the locked list
// and its record are unchanged. Legs whose race went VOID by the off won
// 6/19, -30% at BSP (Aug-Oct archive).
function legNoBet(p) {
    // Before the 09:00 lock the list is provisional - the lock re-picks on
    // the live prices, so there is nothing "since 09:00" to compare yet.
    if (!p || p.nonRunner || p.abandoned || p.provisional) return false;
    // A value leg is chosen on its chance vs the price, not as the race's pick (2026-11-04).
    if (p.tier === "Value") return false;
    const pickChanged = p.nowPick && String(p.nowPick).toUpperCase() !== String(p.horse || "").toUpperCase();
    return Boolean(pickChanged || p.nowTier === "Open");
}

function legNoBetReason(p) {
    const pickChanged = p.nowPick && String(p.nowPick).toUpperCase() !== String(p.horse || "").toUpperCase();
    return pickChanged
        ? `Market has moved since 09:00 - the race page now picks ${p.nowPick}${p.nowTier === "Open" ? " and there is no clear pick" : ""}, so no bet on the Daily Double.`
        : "Market has moved since 09:00 - no clear pick in this race now, so no bet.";
}

// "WON at 5/4" / "Lost - finished 4th of 9. Won by X (3/1)" for a horse whose
// race has a result (dashboardService raceResult; user 2026-11-05).
function resultLineHtml(res) {
    if (!res) return "";
    const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"));
    const words = s => String(s || "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/^./, c => c.toUpperCase());
    const wonBy = res.winner ? `. Won by ${escapeHtml(res.winner)}${res.winnerOdds ? ` (${escapeHtml(res.winnerOdds)})` : ""}` : "";
    if (res.position === 1) return `<div class="nap-result nap-result-won">WON${res.odds ? ` at ${escapeHtml(res.odds)}` : ""}</div>`;
    if (res.position > 1) return `<div class="nap-result nap-result-lost">Lost - finished ${ord(res.position)}${res.runners ? ` of ${res.runners}` : ""}${wonBy}</div>`;
    return `<div class="nap-result nap-result-lost">Lost - ${escapeHtml(words(res.reason) || "did not finish")}${wonBy}</div>`;
}

// The Daily Double's state after racing (user 2026-11-05): void legs
// (non-runner, abandoned, NO BET) drop out as in the running record, the
// rest must all win.
function doubleSummaryHtml(picks, single) {
    const bets = picks.filter(p => !p.nonRunner && !p.abandoned && !legNoBet(p));
    if (!bets.length || !bets.some(p => p.result)) return "";
    const lost = bets.filter(p => p.result && p.result.position !== 1).length;
    const won = bets.filter(p => p.result?.position === 1).length;
    const name = single ? "Single" : "Double";
    if (lost) return `<div class="dd-summary dd-summary-lost">${name} lost</div>`;
    if (won === bets.length) return `<div class="dd-summary dd-summary-won">${name} landed${picks.length > bets.length ? " (void leg dropped)" : ""}</div>`;
    return `<div class="dd-summary">${won} of ${bets.length} won so far</div>`;
}

function renderDailyDouble(dashboard) {

    const box = document.getElementById("dailyDoubleBox");
    if (!box) return;

    const picks = Array.isArray(dashboard?.dailyDouble) ? dashboard.dailyDouble : [];
    window.__dailyDouble = picks; // the race page says when its race holds a Daily Double leg

    if (!picks.length) {
        box.innerHTML = `
            <div class="daily-double-panel">
                <div class="daily-double-header">⭐ Daily Double</div>
                <div class="daily-double-empty-text">No value, Strong or Moderate pick at evens (2.0) or bigger today — an honest zero, not padded with a weaker race.</div>
            </div>
        `;
        return;
    }

    const rows = picks.map((p, i) => `
        <div
            class="daily-double-pick"
            id="daily-double-pick-${i}"
            data-horse="${escapeHtml(String(p.horse || "").toUpperCase())}"
            data-course="${escapeHtml(String(p.course || "").toUpperCase())}"
            data-time="${escapeHtml(p.time || "")}"
            data-meeting-id="${escapeHtml(String(p.meetingId ?? ""))}"
            data-race-index="${escapeHtml(String(p.raceIndex ?? ""))}"
            style="cursor:pointer;"
        >
            <div class="daily-double-rank">${i + 1}</div>
            ${p.silk ? `<img src="${escapeHtml(String(p.silk))}" class="pick-silk" alt="" loading="lazy" onerror="this.style.display='none';">` : ""}
            <div class="daily-double-body">
                <div class="daily-double-horse">
                    <span${legNoBet(p) || p.abandoned ? ' style="text-decoration:line-through;opacity:0.6;"' : ""}>${escapeHtml(p.horse)}</span>
                    <span class="daily-double-tier">${p.nap && p.napNow !== false ? "NAP &middot; " : ""}${escapeHtml(p.tier)}</span>
                    ${p.nonRunner ? `<span class="daily-double-nr" style="color:#c0392b;font-weight:700;margin-left:6px;" title="Withdrawn after the Daily Double was locked this morning">Non-runner</span>` : ""}
                    ${legNoBet(p) ? `<span class="daily-double-nr" style="color:#c0392b;font-weight:700;margin-left:6px;">NO BET</span>` : ""}
                    ${p.abandoned ? `<span class="daily-double-nr" style="color:#c0392b;font-weight:700;margin-left:6px;">ABANDONED</span>` : ""}
                </div>
                ${p.abandoned ? `<div class="daily-double-race" style="color:#c0392b;font-weight:600;">This meeting was abandoned after the Daily Double was locked - this leg is void.</div>` : ""}
                ${legNoBet(p) ? `<div class="daily-double-race" style="color:#c0392b;font-weight:600;">${escapeHtml(legNoBetReason(p))}</div>` : ""}
                ${p.nonRunner || p.abandoned || legNoBet(p) ? "" : resultLineHtml(p.result)}
                <div class="daily-double-race">${escapeHtml(p.course)} ${escapeHtml(toLocalTimeString(p.time))}</div>
                <div class="daily-double-rating">${p.tier === "Value" && p.chance != null
                    ? `${escapeHtml(p.odds)} &middot; ${Math.round(100 * p.chance)}% chance, ${Math.round(100 * p.edge)}% better than the price`
                    : `EPR ${escapeHtml(p.rating)} <span class="daily-double-margin">(${escapeHtml(p.margin)} pts ahead)</span>`}</div>
            </div>
        </div>
    `).join("");

    const headerText = dashboard?.dailyDoublePickMode === "single"
        ? "\u2B50 Daily Single"
        : "\u2B50 Daily Double";
    const provisionalNote = picks.some(p => p.provisional)
        ? `<div class="daily-double-race" style="opacity:0.8;">Provisional - set at 09:00 on the live prices.</div>`
        : "";

    box.innerHTML = `
        <div class="daily-double-panel">
            <div class="daily-double-header">${headerText}</div>
            ${provisionalNote}
            ${rows}
            ${doubleSummaryHtml(picks, dashboard?.dailyDoublePickMode === "single")}
        </div>
    `;

    box.querySelectorAll(".daily-double-pick").forEach(el => {

        const meetingId = el.dataset.meetingId;
        const raceIndex = Number(el.dataset.raceIndex);
        const course = el.dataset.course;
        const time = el.dataset.time;

        if (!meetingId || !Number.isFinite(raceIndex)) return;

        el.addEventListener("click", async () => {

            await loadRaces(meetingId, course, false);
            await loadRace(meetingId, raceIndex, toLocalTimeString(time));

            document.getElementById("analysisSection")
                .scrollIntoView({ behavior: "smooth", block: "start" });

        });

    });

}

// Adds a small "BEST OPPORTUNITY" badge onto Daily Double pick #1, ONLY
// when it genuinely is the same race/horse as the live Best Opportunity
// computation - never shows two different named picks on the same page.
function applyBestOpportunityBadge(hero) {

    const pick0 = document.getElementById("daily-double-pick-0");
    if (!pick0) return;

    // Clear any previous badge before deciding whether to re-add one.
    const existing = pick0.querySelector(".best-opportunity-badge");
    if (existing) existing.remove();

    if (!hero) return;

    const matches =
        String(hero.horse || "").toUpperCase() === pick0.dataset.horse &&
        String(hero.course || "").toUpperCase() === pick0.dataset.course &&
        String(hero.raceTime || "") === pick0.dataset.time;

    if (!matches) return;

    const horseLine = pick0.querySelector(".daily-double-horse");
    if (!horseLine) return;

    const badge = document.createElement("span");
    badge.className = "best-opportunity-badge";
    badge.textContent = "\u2605 BEST OPPORTUNITY";
    horseLine.appendChild(badge);

}

// Renders the NAP (3-signal system) pick into its own dedicated,
// clearly-labelled box - deliberately separate from the Best
// Opportunity badge above, which is reserved for the statistically-
// guarded Strong-tier+10pt signal (see applyBestOpportunityBadge /
// the 2026-08-31 fix). NAP's selection logic isn't guarded the same
// way, so it's never allowed to substitute for Best Opportunity -
// it gets its own honest, separately-labelled slot instead.
function renderNapCallout(nap) {

    const napEl = document.getElementById("napCallout");
    if (!napEl) return;

    if (!nap) {
        napEl.style.display = "none";
        napEl.innerHTML = "";
        napEl.onclick = null;
        return;
    }

    // Market-override pick: the stored gap is the rating leader's lead, not this horse's.
    const gapText =
        nap.modelTop && nap.modelTop.name
            ? ` \u2022 market pick; model prefers ${escapeHtml(nap.modelTop.name)} (${nap.modelTop.rating})`
            : typeof nap.gap === "number" && nap.gap > 0
                ? ` \u2022 +${nap.gap.toFixed(1)} clear`
                : "";

    const timeText =
        nap.time ? toLocalTimeString(nap.time) : "-";

    // Jockey silks (user 2026-11-05).
    const napSilk = nap.silk_url || nap.silkUrl;
    // Its state now and, after the race, how it finished (user 2026-11-05;
    // built by dashboardService napNow).
    const now = nap.now || {};
    const res = now.result;
    const struck = now.nonRunner || now.abandoned || now.noBet;
    const flag = now.nonRunner ? "NON-RUNNER" : now.abandoned ? "ABANDONED" : now.noBet ? "NO BET" : "";
    const flagWhy = now.nonRunner ? "Withdrawn since the NAP was chosen - no bet."
        : now.abandoned ? "The meeting has been abandoned - no bet."
        : now.noBet ? `Market has moved since 09:00 - ${now.nowPick && String(now.nowPick).toUpperCase() !== String(nap.name || "").toUpperCase() ? `the race page now picks ${escapeHtml(now.nowPick)}` : "no clear pick in this race now"}, so no bet.`
        : "";
    const resultHtml = resultLineHtml(res);
    // Countdown to the off (user 2026-11-05); race times are UTC. Gone once
    // the result is in or the horse is out.
    const offMs = nap.date && nap.time ? Date.parse(`${nap.date}T${nap.time}:00Z`) : NaN;
    const countdownHtml = !res && !struck && Number.isFinite(offMs)
        ? `<span class="nap-countdown" data-off="${offMs}"></span>` : "";
    napEl.innerHTML = `
        <div class="nap-label">Today's NAP \u2022 ${nap.signalCount ?? 0}/3 signals</div>
        <div class="nap-row">
            ${napSilk ? `<img src="${escapeHtml(String(napSilk))}" class="pick-silk" alt="" loading="lazy" onerror="this.style.display='none';">` : ""}
            <div>
                <div class="nap-name"><span${struck ? ' style="text-decoration:line-through;opacity:0.6;"' : ""}>${escapeHtml(String(nap.name || "").toUpperCase())}</span>${flag ? ` <span class="nap-flag">${flag}</span>` : ""}</div>
                ${flagWhy ? `<div class="nap-flag-why">${flagWhy}</div>` : ""}
                ${resultHtml}
                <div class="nap-meta">${escapeHtml(nap.meeting ?? "-")} ${escapeHtml(timeText)}${countdownHtml} \u2022 EPR ${nap.rating ?? "-"}${gapText}</div>
                <div class="nap-meta">${escapeHtml(nap.status_message || "3-signal pick, not Strong-tier guaranteed")}</div>
            </div>
        </div>
    `;

    napEl.style.display = "";
    tickNapCountdown();

    if (nap.meetingId != null && nap.raceIndex != null) {

        napEl.style.cursor = "pointer";

        napEl.onclick = async () => {

            await loadRaces(nap.meetingId, nap.meeting, false);
            await loadRace(nap.meetingId, nap.raceIndex, timeText);

            document.getElementById("analysisSection")
                .scrollIntoView({ behavior: "smooth", block: "start" });

        };

    } else {

        napEl.style.cursor = "default";
        napEl.onclick = null;

    }

}

function tickNapCountdown() {
    const el = document.querySelector(".nap-countdown");
    if (!el) return;
    const mins = Math.ceil((Number(el.dataset.off) - Date.now()) / 60000);
    el.textContent = mins <= 0 ? " \u2022 off" : ` \u2022 off in ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}`;
    el.classList.toggle("nap-countdown-soon", mins > 0 && mins <= 15);
}

function escapeHtml(str) {
    if (typeof str !== "string") return str ?? "";

    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Must agree with clock.js's toLocalTimeString() on how it interprets
// the same raw time string - found 2026-09-27 to disagree: this
// function applied the BST shift but not the "1-11 means PM" shift
// toLocalTimeString applies, so the same race sorted/compared
// differently depending which of the two functions computed its time.
function parseLondonTimeToSeconds(timeStr) {
    if (!timeStr) return 0;

    const parts = String(timeStr).split(":");

    if (parts.length < 2) return 0;

    // Same real Europe/London conversion as clock.js's toLocalTimeString
    // (replaces an "add 12 to hours 1-11" guess - see utcTimeToLondon).
    const t = utcTimeToLondon(`${parts[0]}:${parts[1]}`);
    if (!t) return 0;

    return (t.h * 3600) + (t.m * 60);
}

const TIER_STRONG_CUT = 0.50;
const TIER_MODERATE_CUT = 0.30;
const TIER_MIN_FIELD_FOR_STRONG = 5;
const TIER_MIN_ABSOLUTE_MARGIN = 1.0;

// Mirrors checklistEngine.js's parseFractionalOdds exactly.
function parseFractionalOddsLocal(value) {

    if (typeof value !== "string") return null;

    const clean = value.trim().toLowerCase();

    if (clean === "evens" || clean === "evs") return 1;

    const fractionMatch = clean.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) return Number(fractionMatch[1]) / Number(fractionMatch[2]);

    const whole = Number(clean);
    return isNaN(whole) ? null : whole;

}

// This is the 4th independent classifyRace-style reimplementation in
// this codebase (js/marginTiers.js is canonical; generateDailyShortlist.js
// and backend/services/dashboardService.js each have their own too) - it
// drives the live race page's VOID BET watermark and CLEAR TOP PICK /
// MODERATE SEPARATION label. Found 2026-09-27 to be missing the
// market-clarity and handicap gates the other three all apply, so a
// race the authoritative logic would downgrade to Open could still
// show as confident here. Both gates added to match.
function raceMarginTier(runners, raceTitle) {

    const ratings =
        (runners || [])
            .map(r => r?.elite?.rating)
            .filter(v => typeof v === "number");

    if (ratings.length < 2) {
        return null;
    }

    const top = ratings[0];
    const margin = top - ratings[1];
    const spread = top - ratings[ratings.length - 1];

    if (spread <= 0) {
        return {
            tier: "Open",
            margin,
            relativeMargin: 0
        };
    }

    const relativeMargin =
        ratings.length >= 3
            ? margin / spread
            : (top > 0 ? margin / top : 0);

    if (margin < TIER_MIN_ABSOLUTE_MARGIN) {
        return {
            tier: "Open",
            margin,
            relativeMargin
        };
    }

    let tier =
        (
            relativeMargin >= TIER_STRONG_CUT &&
            ratings.length >= TIER_MIN_FIELD_FOR_STRONG
        )
            ? "Strong"
            : relativeMargin >= TIER_MODERATE_CUT
                ? "Moderate"
                : "Open";

    if (tier === "Strong" || tier === "Moderate") {

        const priced =
            (runners || [])
                .map(r => parseFractionalOddsLocal(r?.current_odds))
                .filter(v => v != null)
                .sort((a, b) => a - b);

        if (priced.length >= 2) {

            const gapRatio = (priced[1] + 1) / (priced[0] + 1);

            if (gapRatio < 1.5) {
                tier = "Open";
            }

        }

        if (
            tier !== "Open" &&
            typeof raceTitle === "string" &&
            /handicap|nursery/i.test(raceTitle)
        ) {
            tier = "Open";
        }

    }

    return {
        tier,
        margin,
        relativeMargin
    };
}

function drawBadgeClass(breakdown) {

    const draw = breakdown?.draw;

    if (!draw || draw.max === 0) {
        return "runner-draw-neutral";
    }

    if (draw.answer === "No") {
        return "runner-draw-good";
    }

    if (draw.answer === "Yes") {
        return "runner-draw-bad";
    }

    return "runner-draw-neutral";
}

function drawBadgeTitle(breakdown) {

    const draw = breakdown?.draw;

    if (!draw || draw.max === 0) {
        return "No draw bias data for this course/distance";
    }

    return escapeHtml(
        draw.evidence ||
        (
            draw.answer === "No"
                ? "Favourable draw"
                : "Unfavourable draw"
        )
    );
}

function buildChecklistSummary(breakdown) {

    if (!breakdown) {
        return "";
    }

    const chips =
        Object.entries(breakdown)
            .filter(([, data]) => data.max > 0)
            .map(([key, data]) => {

                const short =
                    CHECKLIST_SHORT[key] ||
                    key.slice(0, 2);

                const full =
                    CHECKLIST_LABELS[key] ||
                    key;

                let chipClass =
                    "checklist-chip-zero";

                if (data.points === data.max) {

                    chipClass =
                        data.points >= 2
                            ? "checklist-chip-high-impact"
                            : "checklist-chip-full";

                } else if (data.points > 0) {

                    chipClass =
                        "checklist-chip-partial";
                }

                return `
                    <span
                        class="checklist-chip ${chipClass}"
                        title="${escapeHtml(full)}: ${escapeHtml(data.answer)}"
                    >${short}</span>
                `;
            })
            .join("");

    return chips
        ? `<div class="checklist-summary">${chips}</div>`
        : "";
}

function buildTripClassBadges(breakdown) {

    if (!breakdown) {
        return "";
    }

    const parts = [];

    const classChange =
        breakdown.classChange;

    if (
        classChange &&
        classChange.answer !== "N/A"
    ) {

        const cls =
            classChange.answer === "Down"
                ? "tc-mini-good"
                : classChange.answer === "Up"
                    ? "tc-mini-bad"
                    : "tc-mini-neutral";

        parts.push(`
            <span
                class="tc-mini ${cls}"
                title="Class: ${escapeHtml(
                    classChange.evidence ||
                    classChange.answer
                )}"
            >C</span>
        `);
    }

    const tripChange =
        breakdown.tripChange;

    if (
        tripChange &&
        tripChange.answer !== "N/A"
    ) {

        const cls =
            tripChange.answer === "Down"
                ? "tc-mini-good"
                : tripChange.answer === "Up"
                    ? "tc-mini-bad"
                    : "tc-mini-neutral";

        parts.push(`
            <span
                class="tc-mini ${cls}"
                title="Trip: ${escapeHtml(
                    tripChange.evidence ||
                    tripChange.answer
                )}"
            >T</span>
        `);
    }

    return parts.join("");
}

function buildPriceBadge(breakdown) {

    const move =
        breakdown?.marketMove;

    if (
        !move ||
        move.answer === "N/A" ||
        !move.evidence
    ) {
        return "";
    }

    const parts =
        move.evidence.split(" → ");

    if (parts.length < 2) {
        return "";
    }

    const latestPrice =
        parts[1]
            .split(" (")[0]
            .trim();

    if (!latestPrice) {
        return "";
    }

    const cls =
        move.answer === "Steamer"
            ? "price-badge-in"
            : move.answer === "Drifter"
                ? "price-badge-out"
                : "price-badge-steady";

    const arrow =
        move.answer === "Steamer"
            ? "▼"
            : move.answer === "Drifter"
                ? "▲"
                : "–";

    return `
        <span
            class="price-badge ${cls}"
            title="${escapeHtml(move.evidence)}"
        >${arrow} ${escapeHtml(latestPrice)}</span>
    `;
}

function buildLiveMoveBadge(breakdown) {

    const move =
        breakdown?.marketMove;

    if (
        !move ||
        move.answer === "N/A"
    ) {
        return "";
    }

    if (
        !move.evidence ||
        !move.evidence.includes("live")
    ) {
        return "";
    }

    const cls =
        move.answer === "Steamer"
            ? "live-move-good"
            : move.answer === "Drifter"
                ? "live-move-bad"
                : "live-move-neutral";

    return `
        <span
            class="live-move-badge ${cls}"
            title="${escapeHtml(move.evidence)}"
        >
            🔴 LIVE: ${escapeHtml(move.answer)}
        </span>
    `;
}

function buildWinningMarkBadge(breakdown) {

    const wm =
        breakdown?.winningMark;

    if (
        !wm ||
        wm.answer !== "Yes"
    ) {
        return "";
    }

    return `
        <span
            class="winning-mark-badge"
            title="${escapeHtml(wm.evidence || "")}"
        >
            ⬇ WELL TREATED
        </span>
    `;
}

function buildChecklistPanel(breakdown) {

    if (!breakdown) {

        return `
            <div class="checklist-panel">
                <div class="checklist-empty">
                    No breakdown data available for this runner.
                </div>
            </div>
        `;
    }

    const rows =
        Object.entries(breakdown)
            .map(([key, data]) => {

                const label =
                    CHECKLIST_LABELS[key] ||
                    key;

                const pointsText =
                    data.max > 0
                        ? `${data.points}/${data.max}`
                        : "N/A";

                const evidenceText =
                    data.evidence
                        ? data.evidence
                        : (
                            data.note
                                ? data.note
                                : ""
                        );

                return (
                    `<div class="checklist-row">` +
                        `<span class="checklist-label">${escapeHtml(label)}</span>` +
                        `<span class="checklist-points">${escapeHtml(pointsText)}</span>` +
                        `<span class="checklist-answer">${escapeHtml(data.answer)}</span>` +
                        `<span class="checklist-evidence">${escapeHtml(evidenceText)}</span>` +
                    `</div>`
                );
            })
            .join("");

    return `
        <div class="checklist-panel">
            ${rows}
        </div>
    `;
}

const ENGINE_LABELS = {
    form: "Form",
    context: "Context",
    market: "Market",
    verdict: "Verdict"
};

// Order matters here for how it reads - form/context/market/verdict,
// matching the order predictor.js actually scores them in.
const ENGINE_ORDER = ["form", "context", "market", "verdict"];

function buildEngineBreakdownPanel(engineDetails, starsPart = null) {

    if (!engineDetails) {

        return `
            <div class="engine-panel">
                <div class="engine-empty">
                    No scoring breakdown available for this runner.
                </div>
            </div>
        `;
    }

    const keys =
        ENGINE_ORDER.filter(k => engineDetails[k]);

    const rows =
        keys
            .map(key => {

                const data = engineDetails[key];

                const label =
                    ENGINE_LABELS[key] ||
                    key;

                const scoreText =
                    data?.score != null
                        ? `${data.score}/100`
                        : "N/A";

                const confidenceText =
                    data?.confidence || "";

                const reasonsText =
                    (data?.reasons || []).join("; ") ||
                    "No reasons given";

                return (
                    `<div class="engine-row">` +
                        `<span class="engine-label">${escapeHtml(label)}</span>` +
                        `<span class="engine-score">${escapeHtml(scoreText)}</span>` +
                        `<span class="engine-confidence">${escapeHtml(confidenceText)}</span>` +
                        `<span class="engine-reasons">${escapeHtml(reasonsText)}</span>` +
                    `</div>`
                );
            })
            .join("");

    // Timeform stars (2026-10-25) are added on top of the four parts:
    // 4 rating points per star above or below 3 (engine-v2/starsEngine.js).
    const stars = Number(starsPart?.stars);
    const hasStars = Number.isInteger(stars) && stars >= 1 && stars <= 5;
    const points = Number(starsPart?.weighted) || 0;
    const starsRow = hasStars
        ? `<div class="engine-row">` +
              `<span class="engine-label">Timeform stars</span>` +
              `<span class="engine-score">${stars}/5</span>` +
              `<span class="engine-confidence"></span>` +
              `<span class="engine-reasons">${escapeHtml(points === 0 ? "No change to the rating (3 stars)" : `${points > 0 ? "+" : ""}${points} rating points`)}</span>` +
          `</div>`
        : "";

    return `
        <div class="engine-panel">
            <div class="engine-panel-note">
                ${hasStars
                    ? "These four, plus the Timeform stars, combine to set the ELITE rating shown above."
                    : "These four combine to set the ELITE rating shown above."}
                The checklist below only ever breaks an exact tie between two runners.
            </div>
            ${rows}
            ${starsRow}
        </div>
    `;
}

function highlightSelectedHorses(
    text,
    verdictText,
    runners
) {

    if (
        !text ||
        !verdictText ||
        !runners?.length
    ) {
        return escapeHtml(text);
    }

    const tail =
        verdictText
            .slice(-120)
            .toUpperCase();

    const selected =
        runners
            .filter(r =>
                tail.includes(
                    String(
                        r.name || ""
                    ).toUpperCase()
                )
            )
            .map(r => r.name);

    let result =
        escapeHtml(text);

    if (!selected.length) {
        return result;
    }

    const sorted =
        [...selected]
            .sort(
                (a, b) =>
                    b.length - a.length
            );

    for (const name of sorted) {

        const escapedName =
            escapeHtml(name);

        const escapedPattern =
            name.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

        const pattern =
            new RegExp(
                `(${escapedPattern})`,
                "gi"
            );

        result =
            result.replace(
                pattern,
                '<span class="analysis-highlight">$1</span>'
            );
    }

    return result;
}

function getLondonNowSeconds() {

    const parts =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone: "Europe/London",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            }
        )
        .formatToParts(new Date());

    const get =
        type =>
            Number(
                parts.find(
                    p => p.type === type
                )?.value ?? 0
            );

    return (
        get("hour") * 3600 +
        get("minute") * 60 +
        get("second")
    );
}

// ---------------------------------------------------------------------------
// Race results on the race card (2026-10-11). /api/checkResults already scores
// every finished race against our pick; its details carry the winner and the
// top four with starting prices. One fetch is shared (45 s) by every race
// click and the live refresh. A race with no result yet simply shows nothing.
// ---------------------------------------------------------------------------
let resultDetailsCache = { at: 0, promise: null };

function getResultDetails() {
    if (resultDetailsCache.promise && Date.now() - resultDetailsCache.at < 45000) {
        return resultDetailsCache.promise;
    }
    resultDetailsCache = {
        at: Date.now(),
        promise: fetch(`data/checkResults.json?t=${Date.now()}`, { cache: "no-store" })
            .then(r => (r.ok ? r.json() : null))
            .then(d => (d && d.success && Array.isArray(d.details) ? d.details : []))
            .catch(() => [])
    };
    return resultDetailsCache.promise;
}

function resultKey(s) {
    return String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function findResultDetail(course, time) {
    const details = await getResultDetails();
    return details.find(d => resultKey(d.course) === resultKey(course) && d.time === time) || null;
}

function ordinal(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "";
    const s = ["th", "st", "nd", "rd"], m = v % 100;
    return v + (s[(m - 20) % 10] || s[m] || s[0]);
}

// Top finishers for the banner and the row pills. Older cached results have
// only names (actualTopThree); newer ones carry position and starting price.
function resultPlaces(detail) {
    if (Array.isArray(detail.actualTop) && detail.actualTop.length) return detail.actualTop;
    const names = detail.actualTopThree?.length ? detail.actualTopThree : (detail.actualWinner ? [detail.actualWinner] : []);
    return names.map((name, i) => ({ position: i + 1, name, odds: null }));
}

// Every finisher (position + starting price) when the API sent the full field,
// else just the top four / top three.
function resultFinishers(detail) {
    if (Array.isArray(detail.finishers) && detail.finishers.length) return detail.finishers;
    return resultPlaces(detail);
}

const NON_FINISHER_CODES = {
    pulledup: "PU", fell: "F", unseated: "UR", unseatedrider: "UR", brought: "BD", broughtdown: "BD",
    refused: "REF", ranout: "RO", slippedup: "SU", disqualified: "DSQ", carriedout: "CO", virtualrace: "VR"
};
function nonFinisherCode(reason) {
    const k = String(reason || "").toLowerCase().replace(/[^a-z]/g, "");
    return NON_FINISHER_CODES[k] || (String(reason || "").slice(0, 3).toUpperCase() || "NF");
}

function renderResultBanner(detail) {
    const places = resultPlaces(detail).slice(0, 4);
    if (!places.length) return null;
    const pick = detail.outcome === "won"
        ? `Our pick ${escapeHtml(detail.ourPick)} won`
        : detail.outcome === "placed"
            ? `Our pick ${escapeHtml(detail.ourPick)} placed (${ordinal(detail.ourPickPosition)})`
            : `Our pick ${escapeHtml(detail.ourPick)} ${detail.ourPickPosition ? "finished " + ordinal(detail.ourPickPosition) : "did not place"}`;
    const box = document.createElement("div");
    box.className = "race-result-banner";
    box.innerHTML =
        `<span class="race-result-label">Result</span>` +
        places.map(p => `<span class="race-result-place"><b>${ordinal(p.position)}</b> ${escapeHtml(p.name)}${p.odds ? ` <i>${escapeHtml(p.odds)}</i>` : ""}</span>`).join("") +
        `<span class="race-result-pick ${escapeHtml(detail.outcome || "unplaced")}">${pick}</span>`;
    // Optional re-sort of the runner rows into finishing order (non-finishers last).
    const all = resultFinishers(detail);
    if (all.length > 1) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "race-result-sort";
        btn.textContent = "Show in finishing order";
        btn.dataset.mode = "ratings";
        btn.addEventListener("click", () => {
            const cont = document.getElementById("analysis");
            if (!cont) return;
            const toFinish = btn.dataset.mode === "ratings";
            const pos = new Map(all.map(p => [resultKey(p.name), Number(p.position)]));
            const cards = [...cont.querySelectorAll(".runner-card:not(.runner-card-nonrunner)")];
            cards.sort((a, b) => toFinish
                ? (pos.get(a.dataset.horse) ?? 999) - (pos.get(b.dataset.horse) ?? 999) || Number(a.dataset.idx) - Number(b.dataset.idx)
                : Number(a.dataset.idx) - Number(b.dataset.idx));
            const ref = cont.querySelector(".runner-card-nonrunner");
            cards.forEach(c => cont.insertBefore(c, ref));
            btn.dataset.mode = toFinish ? "finish" : "ratings";
            btn.textContent = toFinish ? "Show in rating order" : "Show in finishing order";
        });
        box.appendChild(btn);
    }
    return box;
}

function renderCandidateBoard(dashboard) {

    const board =
        document.getElementById(
            "pick-board-list"
        );

    if (!board) {
        return;
    }

    const strongCandidates =
        Array.isArray(
            dashboard?.strongCandidates
        )
            ? dashboard.strongCandidates
            : [];

    const worthConsidering =
        Array.isArray(
            dashboard?.worthConsidering
        )
            ? dashboard.worthConsidering
            : [];

    /*
    ============================================================================
    HERO HORSES — CHRONOLOGICAL ORDER

    Sort Strong candidates by race time for display only.
    Production selection, ratings and candidate data remain unchanged.
    ============================================================================
    */

 /*
============================================================================
HERO HORSES — CHRONOLOGICAL DISPLAY ORDER

Sort the COMPLETE candidate board by race time.
This affects display order only.
Production selection, ratings and candidate data remain unchanged.
============================================================================
*/

const picks = [
    ...strongCandidates.map(
        candidate => ({
            candidate,
            tierClass: "tier-strong",
            tierLabel: "strong"
        })
    ),
    ...worthConsidering.map(
        candidate => ({
            candidate,
            tierClass: "tier-open",
            tierLabel: "considering"
        })
    )
];

const getCandidateTime = ({ candidate }) =>
    String(
        candidate?.raceTime ??
        candidate?.race ??
        candidate?.time ??
        ""
    );

const getCandidateSeconds = ({ candidate }) => {

    const time =
        getCandidateTime({ candidate });

    const seconds =
        parseLondonTimeToSeconds(time);

    return Number.isFinite(seconds)
        ? seconds
        : Number.MAX_SAFE_INTEGER;
};

picks.sort(
    (a, b) =>
        getCandidateSeconds(a) -
        getCandidateSeconds(b)
);

    if (!picks.length) {

        board.innerHTML =
            `<div class="candidate-board-empty">
                No candidates currently meet the criteria
             </div>`;

        return;
    }

    const renderCandidate =
        ({ candidate, tierClass, tierLabel }) => {

            const horse =
                candidate?.name ??
                candidate?.horse ??
                "-";

            const course =
                candidate?.course ??
                candidate?.meeting ??
                "-";

            const raceTime =
                candidate?.raceTime ??
                candidate?.race ??
                candidate?.time ??
                "";

            const rating =
                candidate?.power_rating ??
                candidate?.rating ??
                null;

            const confidence =
                candidate?.confidence ??
                null;

            const odds =
                candidate?.odds ??
                "";

			const selectionSource =
				candidate?.selection_source ??
				"";

			const selectionLabel =
				candidate?.label ??
				"";
				
			const vulnerability =
				candidate?.vulnerability ??
				null;
				
            const silkUrl =
                candidate?.silkUrl ??
                candidate?.silk_url ??
                null;

            const meetingId =
                candidate?.meetingId ??
                "";

            const raceIndex =
                candidate?.raceIndex;

            const validRaceIndex =
                Number.isFinite(
                    Number(raceIndex)
                );

            return `
                <button
                    type="button"
                    class="candidate-board-item"
                    data-meeting-id="${escapeHtml(
                        String(meetingId)
                    )}"
                    data-meeting="${escapeHtml(
                        String(course)
                    )}"
                    data-race-index="${
                        validRaceIndex
                            ? escapeHtml(
                                String(
                                    raceIndex
                                )
                            )
                            : ""
                    }"
                    data-race-time="${escapeHtml(
                        String(raceTime)
                    )}"
                >

                    <span
                        class="candidate-tier-dot ${tierClass}"
                        title="${escapeHtml(tierLabel)}"
                    ></span>

                    ${
                        silkUrl
                            ? `
                                <img
                                    src="${escapeHtml(
                                        String(
                                            silkUrl
                                        )
                                    )}"
                                    class="candidate-board-silk"
                                    alt=""
                                    loading="lazy"
                                >
                              `
                            : `
                                <span class="candidate-board-silk candidate-board-silk-empty"></span>
                              `
                    }

                    <span class="candidate-board-info">

 <span class="candidate-board-horse">
    ${escapeHtml(
        String(horse)
    )}

    ${
        selectionSource === "MARKET"
            ? `
                <span
                    class="candidate-selection-badge candidate-selection-market"
                >
                    MARKET SELECTION
                </span>
              `
            : selectionSource === "EPR"
                ? `
                    <span
                        class="candidate-selection-badge candidate-selection-epr"
                    >
                        EPR SELECTION
                    </span>
                  `
                : ""
    }
</span>

<span class="candidate-board-race">


                            ${escapeHtml(
                                String(course)
                            )}

                            ${
                                raceTime
                                    ? ` ${escapeHtml(
                                        toLocalTimeString(
                                            raceTime
                                        )
                                    )}`
                                    : ""
                            }

                            ${
                                odds
                                    ? ` · ${escapeHtml(
                                        String(
                                            odds
                                        )
                                    )}`
                                    : ""
                            }

                        </span>

						${
							vulnerability?.vulnerable
								? `
									<span
										class="candidate-vulnerability-badge"
										style="background: rgba(220, 38, 38, 0.15); border: 1px solid #DC2626; color: #DC2626; border-radius: 4px; padding: 2px 6px; font-size: 11px; margin-left: 6px; display: inline-block;"
										title="Validated 2026-09-05: top pick wins 15.4% in these races vs 25.9% normally - a real, significant drop. The named challenger itself does not win more than a typical #2 (20.6% vs 19.3%, not significant) - the extra risk is spread across the field, not concentrated on one horse."
									>
										⚠️ Close call — less certain than usual
									</span>
								  `
								: ""
						}



                    </span>

                    <span class="candidate-board-rating">

                        ${
                            rating != null
                                ? `EPR ${escapeHtml(
                                    Number(
                                        rating
                                    ).toFixed(1)
                                )}`
                                : "EPR -"
                        }

                        ${
                            confidence != null
                                ? `
                                    <small>
                                        ${escapeHtml(
                                            String(
                                                confidence
                                            )
                                        )}%
                                    </small>
                                  `
                                : ""
                        }

                    </span>

                </button>
            `;
        };

    board.innerHTML =
        picks
            .map(renderCandidate)
            .join("");

    board
        .querySelectorAll(
            ".candidate-board-item"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const meetingId =
                        button.dataset.meetingId;

                    const meeting =
                        button.dataset.meeting;

                    const raceIndex =
                        Number(
                            button.dataset.raceIndex
                        );

                    const raceTime =
                        button.dataset.raceTime;

                    if (
                        !meetingId ||
                        !Number.isFinite(
                            raceIndex
                        )
                    ) {

                        console.warn(
                            "Candidate board item has no valid race context:",
                            {
                                meetingId,
                                meeting,
                                raceIndex,
                                raceTime
                            }
                        );

                        return;
                    }

                    try {

                        await loadRaces(
                            meetingId,
                            meeting,
                            false
                        );

                        await loadRace(
                            meetingId,
                            raceIndex,
                            toLocalTimeString(
                                raceTime
                            )
                        );

                        const analysis =
                            document.getElementById(
                                "analysisSection"
                            );

                        if (analysis) {

                            analysis.scrollIntoView({
                                behavior: "smooth",
                                block: "start"
                            });
                        }

                    } catch (error) {

                        console.error(
                            "Failed to open candidate race:",
                            error
                        );
                    }
                }
            );
        });
}

// What a visitor can actually see change on the race view - used by
// refreshLiveData() to redraw an open race only when something moved,
// so expanded checklist/engine panels aren't collapsed for nothing.
function raceSignature(response) {
    return JSON.stringify(
        (response?.race?.runners || []).map(r => [
            r.id, r.isOurPick, r.isNonRunner, r.current_odds,
            r.elite?.rating, r.elite?.checklistPoints
        ])
    );
}

// options.silent skips the "Loading race data..." placeholder and
// options.prefetched reuses a getRace() response already in hand - both
// used only by the background refreshLiveData() redraw.
// One answer on both pages (2026-10-22): when this race holds a Daily Double
// leg, say so here - including when the market has moved away from it.
function ddLegNote(meetingId, raceIndex, pickRunner) {
    const leg = (window.__dailyDouble || []).find(p =>
        String(p.meetingId) === String(meetingId) && Number(p.raceIndex) === Number(raceIndex));
    if (!leg || leg.nonRunner) return "";
    const style = 'style="margin-top:6px;font-weight:600;"';
    if (legNoBet(leg)) {
        return `<div class="pick-summary-note" ${style}>The 09:00 Daily Double pick here was ${escapeHtml(leg.horse)}. ${escapeHtml(legNoBetReason(leg))}</div>`;
    }
    return String(leg.horse || "").toUpperCase() === String(pickRunner?.name || "").toUpperCase()
        ? `<div class="pick-summary-note" ${style}>${leg.provisional
            ? "This is today's provisional Daily Double pick - the list is set at 09:00."
            : "This is today's Daily Double pick (set at 09:00)."}</div>`
        : "";
}

// Highlight the open race's meeting and race buttons (user 2026-11-05). Races
// opened from the NAP, the Daily Double, Coming up or on page load used to
// leave both unmarked - only a click on the button itself set it.
let openRace = null;
function markSelected(meetingId = openRace?.meetingId, raceIndex = openRace?.raceIndex) {
    if (meetingId == null) return;
    openRace = { meetingId, raceIndex };
    document.querySelectorAll(".meeting-card").forEach(el =>
        el.classList.toggle("active", el.dataset.meetingId === String(meetingId)));
    document.querySelectorAll(".race-card").forEach(el =>
        el.classList.toggle("active", el.dataset.meetingId === String(meetingId) && el.dataset.raceIndex === String(raceIndex)));
}

async function loadRace(
    meetingId,
    raceIndex,
    raceTime,
    options = {}
) {

    markSelected(meetingId, raceIndex);

    try {

        const container =
            document.getElementById(
                "analysis"
            );

        if (container && !options.silent) {

            container.innerHTML =
                `<div class="race-loading">
                    Loading race data...
                 </div>`;
        }

        const response =
            options.prefetched ||
            await getRace(
                meetingId,
                raceIndex
            );

        if (!response.success) {
            return;
        }

        window.currentRaceContext = {
            meetingId,
            raceIndex,
            date:
                response.meeting.date,
            courseName:
                response.meeting.name,
            raceTime:
                response.race.time,
            displayTime:
                raceTime,
            signature:
                raceSignature(response)
        };

        const raceTitleEl = document.getElementById("raceTitle");
        raceTitleEl.textContent = `${response.meeting.name} ${raceTime} - ${response.race.title}`;

        // Shareable link: the address bar follows the race on screen.
        const thisHash = raceHash(response.meeting.name, raceTime);
        try { history.replaceState(null, "", thisHash); } catch { /* sandboxed preview */ }
        const shareBtn = document.createElement("button");
        shareBtn.type = "button";
        shareBtn.className = "race-share";
        shareBtn.textContent = "Copy link";
        shareBtn.addEventListener("click", async () => {
            const url = location.origin + location.pathname + thisHash;
            try { await navigator.clipboard.writeText(url); shareBtn.textContent = "Link copied"; }
            catch { shareBtn.textContent = url; }
            setTimeout(() => { shareBtn.textContent = "Copy link"; }, 2200);
        });
        raceTitleEl.appendChild(shareBtn);

        const allRunners =
            [...response.race.runners];

        const runners =
            allRunners.filter(
                r => !r.isNonRunner
            );

        const nonRunners =
            allRunners.filter(
                r => r.isNonRunner
            );

        // Numbered 1/2/3 display order is honest rating rank (highest
        // elite.rating first) - same as before 2026-09-24. The actual
        // override-adjusted "our pick" (api/checkResults.js's results
        // tracker uses the same one, via predRace.runners[0]) is flagged
        // separately per-runner via isOurPick (added to the API response
        // 2026-09-24) and marked with its own badge below, rather than
        // reordering the list - a lower-rated official pick still shows
        // up correctly flagged even when it isn't #1 by rating.
        runners.sort(
            (a, b) =>
                b.elite.rating -
                a.elite.rating
        );

        const marginTier =
            raceMarginTier(
                runners,
                response.race.title
            );

        const drawAdv =
            response.race.drawAdvantage ||
            "None";

        const drawAdvClass =
            drawAdv === "None"
                ? "draw-adv-neutral"
                : "draw-adv-active";

		let selectionStatus =
			null;

		if (
			marginTier?.tier ===
			"Strong"
		) {

			selectionStatus = {
				label: "CLEAR TOP PICK",
				className:
					"selection-safe"
			};

		} else if (
			marginTier?.tier ===
			"Moderate"
		) {

			selectionStatus = {
				label: "MODERATE LEAD",
				className:
					"selection-caution"
			};

		} else if (
			marginTier?.tier ===
			"Open"
		) {

			selectionStatus = {
				label: "NO CLEAR TOP PICK",
				className:
					"selection-void"
			};
		}

        // A value pick (2026-11-04, "single Our bet") is the race's bet on its
        // chance vs the price, so the ratings-margin label and VOID BET don't apply.
        const valuePick = response.race.valuePick || null;
        if (valuePick) selectionStatus = { label: "VALUE BET", className: "selection-safe", value: true };

        const tierLabel =
            selectionStatus
                ? `<span class="race-info-dot">•</span>` +
                  `<span class="race-info-item ${selectionStatus.className}" ` +
                  `title="${selectionStatus.className === 'selection-safe' ? 'Our top rating is well clear of the rest of the field.' : selectionStatus.className === 'selection-caution' ? 'Our top rating has a modest lead - less certain than a clear top pick.' : 'The ratings cannot separate the leading runners, so we treat this race as open and do not suggest a bet.'}">` +
                  `${selectionStatus.label}` +
                  `${
                      selectionStatus.value
                          ? ` · ${Math.round(100 * valuePick.chance)}% chance at ${escapeHtml(valuePick.odds)}`
                          : marginTier.margin > 0
                          ? ` · ${marginTier.margin.toFixed(1)} pts ahead of 2nd`
                          : ""
                  }` +
                  `</span>`
                : "";

        const analysisSection =
            document.getElementById(
                "analysisSection"
            );

        if (analysisSection) {

            analysisSection.classList.toggle(
                "race-open",
                marginTier?.tier === "Open" && !valuePick
            );
        }

        document.getElementById(
            "raceInfoBanner"
        ).innerHTML = `
            ${
                (response.race.class != null && !/^(n.a|-|null|undefined|)$/i.test(String(response.race.class).trim()))
                    ? `<span class="race-info-item">Class ${escapeHtml(response.race.class)}</span><span class="race-info-dot">•</span>`
                    : ""
            }

            <span class="race-info-item">
                ${escapeHtml(
                    response.race.distance ?? "-"
                )}
            </span>

            ${
                response.meeting.going
                    ? `<span class="race-info-dot">•</span>

                       <span class="race-info-item">
                           Going: ${escapeHtml(
                               response.meeting.going
                           )}
                       </span>`
                    : ""
            }

            <span class="race-info-dot">•</span>

            <span class="race-info-item ${drawAdvClass}">
                Draw Advantage:
                ${escapeHtml(drawAdv)}
            </span>

            ${tierLabel}
        `;

        container.innerHTML = "";

        // Result of the race, if it has finished (see getResultDetails).
        const resultDetail = await findResultDetail(response.meeting.name, response.race.time);
        window.currentRaceContext.hasResult = !!resultDetail;
        const resultPlacesList = resultDetail ? resultFinishers(resultDetail) : [];
        const nonFinishersList = (resultDetail && Array.isArray(resultDetail.nonFinishers)) ? resultDetail.nonFinishers : [];
        const finishPill = name => {
            if (!resultDetail) return "";
            const p = resultPlacesList.find(x => resultKey(x.name) === resultKey(name));
            if (p) {
                return `<span class="runner-finish-pill runner-finish-${p.position <= 3 ? p.position : "x"}" title="Finished ${ordinal(p.position)}${p.odds ? " at " + escapeHtml(p.odds) : ""}">${ordinal(p.position)}${p.odds ? " &middot; " + escapeHtml(p.odds) : ""}</span>`;
            }
            const nf = nonFinishersList.find(x => resultKey(x.name) === resultKey(name));
            if (nf) {
                return `<span class="runner-finish-pill runner-finish-nf" title="Did not finish: ${escapeHtml(nf.reason || "")}">${escapeHtml(nonFinisherCode(nf.reason))}</span>`;
            }
            if (resultKey(resultDetail.ourPick) === resultKey(name) && resultDetail.ourPickPosition) {
                return `<span class="runner-finish-pill runner-finish-x" title="Finished ${ordinal(resultDetail.ourPickPosition)}">${ordinal(resultDetail.ourPickPosition)}</span>`;
            }
            return "";
        };
        if (resultDetail) {
            const banner = renderResultBanner(resultDetail);
            if (banner) container.appendChild(banner);
        }


        // Claude's independent view box and runner badge removed from the
        // page at the user's request (2026-10-03). js/claudePicks.mjs still
        // runs and records its picks; the API still sends race.claudeView.

        // At-a-glance summary of the pick before the long write-up.
        {
            const pickRunner = runners.find(r => r.isOurPick) || null;
            if (pickRunner) {
                let favV = Infinity, favR = null, favN = 0;
                runners.forEach(r => {
                    const v = parseFractionalOddsLocal(r.current_odds);
                    if (v == null) return;
                    if (v < favV) { favV = v; favR = r; favN = 1; } else if (v === favV) favN++;
                });
                const topRated = runners[0];
                const rankOfPick = runners.indexOf(pickRunner) + 1;
                const agree = favR && favN === 1 && favR === pickRunner;
                const bits = [];
                bits.push(agree
                    ? "Also the market favourite."
                    : favR ? `Market favourite: <b>${escapeHtml(favR.name)}</b> ${escapeHtml(favR.current_odds || "")}${favN > 1 ? " (joint)" : ""}.` : "");
                if (rankOfPick > 1 && topRated) bits.push(`Top-rated on our numbers: <b>${escapeHtml(topRated.name)}</b> (rating ${escapeHtml(topRated.elite.rating)}), our pick ranks #${rankOfPick} on rating - the market price decides the pick.`);
                else bits.push(`Top-rated on our numbers (rating ${escapeHtml(pickRunner.elite.rating)}).`);
                const tierText = selectionStatus?.value
                    ? `Value bet · ${Math.round(100 * valuePick.chance)}% chance at ${valuePick.odds} - ${Math.round(100 * valuePick.edge)}% better than the price`
                    : selectionStatus
                    ? selectionStatus.label + (marginTier.margin > 0 ? ` · ${marginTier.margin.toFixed(1)} pts ahead of 2nd` : "")
                    : "";
                if (selectionStatus?.value) {
                    // Our bet is the value pick: say why, and that rating and market are only background.
                    bits.length = 0;
                    const why = valuePick.reasons?.plus?.length ? ` Why: ${valuePick.reasons.plus.map(escapeHtml).join(", ")}.` : "";
                    const against = valuePick.reasons?.minus?.length ? ` Against: ${valuePick.reasons.minus.map(escapeHtml).join(", ")}.` : "";
                    bits.push(`Chosen because its chance looks bigger than its price.${why}${against}`);
                    if (topRated && topRated !== pickRunner) bits.push(`Top-rated on our numbers: <b>${escapeHtml(topRated.name)}</b> (rating ${escapeHtml(topRated.elite.rating)}).`);
                    else bits.push(`Also top-rated on our numbers (rating ${escapeHtml(pickRunner.elite.rating)}).`);
                    if (favR && favR !== pickRunner) bits.push(`Market favourite: <b>${escapeHtml(favR.name)}</b> ${escapeHtml(favR.current_odds || "")}.`);
                }
                const box = document.createElement("div");
                box.className = "pick-summary" + (selectionStatus ? " pick-summary--" + selectionStatus.className.replace("selection-", "") : "");
                box.innerHTML =
                    `<div class="pick-summary-main"><span class="pick-summary-label">${selectionStatus?.value ? "Our bet" : "Our pick"}</span> <b class="pick-summary-name">${escapeHtml(pickRunner.name)}</b> <span class="pick-summary-odds">${escapeHtml(pickRunner.current_odds || "")}</span></div>` +
                    (tierText ? `<div class="pick-summary-tier">${escapeHtml(tierText)}${selectionStatus.className === "selection-void" ? " - no bet suggested" : ""}</div>` : "") +
                    `<div class="pick-summary-note">${bits.filter(Boolean).join(" ")}</div>` +
                    ddLegNote(meetingId, raceIndex, pickRunner);
                container.appendChild(box);
            }
        }

        if (
            response.race.verdict ||
            response.race.bettingForecast
        ) {

            const summary =
                document.createElement(
                    "div"
                );

            summary.className =
                "race-summary";

            summary.innerHTML = `

                ${
                    response.race.verdict
                        ? `
                            <p class="race-summary-verdict">
                                <strong>SportingLife:</strong>
                                ${highlightSelectedHorses(
                                    response.race.verdict,
                                    response.race.verdict,
                                    response.race.runners
                                )}
                            </p>
                          `
                        : ""
                }

                ${
                    response.race.bettingForecast
                        ? `
                            <p class="race-summary-forecast">
                                <strong>Forecast:</strong>
                                ${highlightSelectedHorses(
                                    response.race.bettingForecast,
                                    response.race.verdict,
                                    response.race.runners
                                )}
                            </p>
                          `
                        : ""
                }

            `;

            container.appendChild(
                summary
            );
        }

        // Shortest price in the market (joint favourites share the badge).
        let favValue = Infinity;
        runners.forEach(r => {
            const v = parseFractionalOddsLocal(r.current_odds);
            if (v != null && v < favValue) favValue = v;
        });
        const favCount = runners.filter(r => parseFractionalOddsLocal(r.current_odds) === favValue).length;
        const isFavourite = r => Number.isFinite(favValue) && parseFractionalOddsLocal(r.current_odds) === favValue;

        const runnerFragment =
            document.createDocumentFragment();

        // Our published pick is listed first (the market-override rule can make it
        // a lower-rated runner); the medals still follow the rating rank.
        const ratingRank = new Map(runners.map((r, i) => [r, i]));
        const pickAt = runners.findIndex(r => r.isOurPick);
        const displayRunners = pickAt > 0
            ? [runners[pickAt], ...runners.filter((_, i) => i !== pickAt)]
            : runners;

        displayRunners.forEach(
            (runner, index) => {

                const rankIdx = ratingRank.get(runner);
                const medal =
                    rankIdx === 0
                        ? "🥇"
                        : rankIdx === 1
                            ? "🥈"
                            : rankIdx === 2
                                ? "🥉"
                                : "";

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "runner-card";
                card.dataset.horse = resultKey(runner.name);
                card.dataset.idx = String(index);

                const rating =
                    runner.elite.rating;

                let ratingClass =
                    "rating-blue";

                if (rating >= 55) {
                    ratingClass =
                        "rating-gold";
                } else if (
                    rating >= 40
                ) {
                    ratingClass =
                        "rating-green";
                } else if (
                    rating < 25
                ) {
                    ratingClass =
                        "rating-grey";
                }

                const confidence =
                    Math.min(
                        runner.elite.confidence,
                        100
                    );

                card.innerHTML = `

                    <div class="runner-row">

                        <div class="runner-left">

                            <div class="runner-medal">
                                ${medal}
                            </div>

                            <div class="runner-cloth">
                                ${escapeHtml(
                                    runner.official_no
                                )}
                            </div>

                            <div
                                class="runner-draw ${drawBadgeClass(
                                    runner.elite.checklistBreakdown
                                )}"
                                title="${drawBadgeTitle(
                                    runner.elite.checklistBreakdown
                                )}"
                            >
                                ${escapeHtml(
                                    runner.draw ?? "-"
                                )}
                            </div>

                            <img
                                class="runner-silk"
                                src="${escapeHtml(
                                    runner.silk_url
                                )}"
                                alt="${escapeHtml(
                                    runner.name
                                )}"
                                onerror="this.style.display='none';"
                            />

                            <div class="runner-details">

                                <div class="runner-name">

                                    ${escapeHtml(
                                        runner.name
                                    )}

                                    ${
                                        runner.isOurPick && response.race.valuePick
                                            ? `<span class="runner-our-pick-badge" title="Our bet in this race: its chance looks bigger than its price">Our bet</span>`
                                            : runner.isOurPick
                                            ? `<span class="runner-our-pick-badge" title="The actual published pick - the market-override rule can promote a shorter-priced runner ahead of our own top rating">Our Pick</span>`
                                            : ""
                                    }

                                    ${isFavourite(runner) ? `<span class="runner-fav-badge" title="Shortest price in the market">${favCount > 1 ? "Joint fav" : "Fav"}</span>` : ""}

                                    ${finishPill(runner.name)}

                                    ${buildPriceBadge(
                                        runner.elite.checklistBreakdown
                                    )}

                                    ${buildLiveMoveBadge(
                                        runner.elite.checklistBreakdown
                                    )}

                                    ${buildWinningMarkBadge(
                                        runner.elite.checklistBreakdown
                                    )}

                                </div>

                                <div class="runner-meta">

                                    T:
                                    ${escapeHtml(
                                        runner.trainer
                                    )}

                                    &nbsp;•&nbsp;

                                    J:
                                    ${escapeHtml(
                                        runner.jockey
                                    )}

                                    &nbsp;•&nbsp;

                                    Form
                                    ${escapeHtml(
                                        runner.formsummary
                                    )}

                                    &nbsp;•&nbsp;

                                    Draw
                                    ${escapeHtml(
                                        runner.draw
                                    )}

                                    &nbsp;•&nbsp;

                                    Wt
                                    ${escapeHtml(
                                        runner.weight
                                    )}

                                    ${buildTripClassBadges(
                                        runner.elite.checklistBreakdown
                                    )}

                                </div>

                                <div class="confidence-bar">

                                    <div
                                        class="confidence-fill"
                                        style="width:${confidence}%"
                                    ></div>

                                </div>

                                <div class="confidence-text">
                                    Confidence
                                    ${confidence.toFixed(1)}%
                                </div>

                                ${buildChecklistSummary(
                                    runner.elite.checklistBreakdown
                                )}

                            </div>

                        </div>

                        <div class="runner-right">

                            <div class="rating-label">
                                ELITE
                            </div>

                            <div
                                class="rating ${ratingClass}"
                            >
                                ${rating.toFixed(1)}
                            </div>

                            <button
                                class="checklist-toggle"
                                type="button"
                            >
                                Show working ▾
                            </button>

                            <button
                                class="engine-toggle"
                                type="button"
                            >
                                Show scoring ▾
                            </button>

                        </div>

                    </div>

                    ${buildChecklistPanel(
                        runner.elite.checklistBreakdown
                    )}

                    ${buildEngineBreakdownPanel(
                        runner.elite.engineDetails,
                        runner.elite.starsPart
                    )}

                `;

                const toggleBtn =
                    card.querySelector(
                        ".checklist-toggle"
                    );

                const panel =
                    card.querySelector(
                        ".checklist-panel"
                    );

                if (
                    toggleBtn &&
                    panel
                ) {

                    toggleBtn.addEventListener(
                        "click",
                        () => {

                            const isOpen =
                                panel.classList.toggle(
                                    "open"
                                );

                            toggleBtn.textContent =
                                isOpen
                                    ? "Hide working ►"
                                    : "Show working ▾";
                        }
                    );
                }

                const engineToggleBtn =
                    card.querySelector(
                        ".engine-toggle"
                    );

                const enginePanel =
                    card.querySelector(
                        ".engine-panel"
                    );

                if (
                    engineToggleBtn &&
                    enginePanel
                ) {

                    engineToggleBtn.addEventListener(
                        "click",
                        () => {

                            const isOpen =
                                enginePanel.classList.toggle(
                                    "open"
                                );

                            engineToggleBtn.textContent =
                                isOpen
                                    ? "Hide scoring ►"
                                    : "Show scoring ▾";
                        }
                    );
                }

                runnerFragment.appendChild(
                    card
                );
            }
        );

        container.appendChild(
            runnerFragment
        );

        if (nonRunners.length) {

            const nrFragment =
                document.createDocumentFragment();

            const nrHeader =
                document.createElement(
                    "div"
                );

            nrHeader.className =
                "non-runners-header";

            nrHeader.textContent =
                `Non-Runners (${nonRunners.length})`;

            nrFragment.appendChild(
                nrHeader
            );

            nonRunners.forEach(
                runner => {

                    const nrCard =
                        document.createElement(
                            "div"
                        );

                    nrCard.className =
                        "runner-card runner-card-nonrunner";

                    nrCard.style.opacity =
                        "0.65";

                    nrCard.style.filter =
                        "grayscale(80%)";

                    nrCard.innerHTML = `

                        <div class="runner-row">

                            <div class="runner-left">

                                <div class="runner-cloth">
                                    ${escapeHtml(
                                        runner.official_no
                                    )}
                                </div>

                                <div class="runner-details">

                                    <div class="runner-name">
                                        ${escapeHtml(
                                            runner.name
                                        )}
                                    </div>

                                    <div class="runner-meta">

                                        T:
                                        ${escapeHtml(
                                            runner.trainer
                                        )}

                                        &nbsp;•&nbsp;

                                        J:
                                        ${escapeHtml(
                                            runner.jockey
                                        )}

                                    </div>

                                </div>

                            </div>

                            <div class="runner-right">

                                <span class="non-runner-badge">
                                    NON-RUNNER
                                </span>

                            </div>

                        </div>

                    `;

                    nrFragment.appendChild(
                        nrCard
                    );
                }
            );

            container.appendChild(
                nrFragment
            );
        }

    } catch (err) {

        console.error(
            "Error loading race:",
            err
        );
    }
}

window.loadRace = loadRace;

async function loadRaces(
    meetingId,
    meetingName,
    autoSelectFirst = true
) {

    try {

        document.getElementById(
            "meetingTitle"
        ).textContent =
            `${meetingName} Races`;

        const response =
            await getRaces(
                meetingId
            );

        if (!response.success) {
            return;
        }

        const container =
            document.getElementById(
                "races"
            );

        container.innerHTML = "";

        let firstCard = null;
        let linkCard = null;
        const wantTime = window.__deepLinkTime || null;
        window.__deepLinkTime = null;

        response.races.forEach(
            (race, index) => {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "race-card";
                card.dataset.meetingId = String(meetingId);
                card.dataset.raceIndex = String(race.index);

                card.innerHTML = `

                    <span class="race-card-time">
                        ${escapeHtml(
                            toLocalTimeString(
                                race.time
                            )
                        )}
                    </span>

                    <span class="race-card-meta">
                        ${
                            (race.class != null && !/^(n.a|-|null|undefined|)$/i.test(String(race.class).trim()))
                                ? `Class ${escapeHtml(race.class)} •`
                                : ""
                        }
                        ${escapeHtml(
                            race.distance
                        )}
                    </span>

                    <span class="race-card-runners">
                        ${escapeHtml(
                            race.runners
                        )}
                        runners
                    </span>

                `;

                card.addEventListener(
                    "click",
                    async () => {

                        container
                            .querySelectorAll(
                                ".race-card"
                            )
                            .forEach(
                                el =>
                                    el.classList.remove(
                                        "active"
                                    )
                            );

                        card.classList.add(
                            "active"
                        );

                        await loadRace(
                            meetingId,
                            race.index,
                            toLocalTimeString(
                                race.time
                            )
                        );

                        document.getElementById("analysisSection")
                            .scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                );

                if (index === 0) {

                    firstCard = {
                        card,
                        race
                    };
                }

                if (wantTime && toLocalTimeString(race.time).replace(":", "") === wantTime) {
                    linkCard = { card, race };
                }

                container.appendChild(
                    card
                );
            }
        );

        const startCard = linkCard || firstCard;

        if (
            startCard &&
            autoSelectFirst
        ) {

            startCard.card.classList.add(
                "active"
            );

            loadRace(
                meetingId,
                startCard.race.index,
                toLocalTimeString(
                    startCard.race.time
                )
            );

            if (linkCard) {
                setTimeout(() => document.getElementById("analysisSection")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }), 600);
            }
        }

    } catch (err) {

        console.error(
            "Error loading races:",
            err
        );
    }
}

export async function loadDashboard() {

    try {

        const response =
            await getDashboard();

        if (!response.success) {

            throw new Error(
                "Dashboard request failed."
            );
        }

        const dashboard =
            response.dashboard;

        // ------------------------------------------------------------
        // TODAY'S BETTING CANDIDATES
        //
        // THIS WAS THE MISSING CALL THAT LEFT BOTH COUNTS AT ZERO.
        // ------------------------------------------------------------

        renderCandidateBoard(
            dashboard
        );

		renderDailyDouble(
			dashboard
		);

		renderYesterdayResults(
			dashboard
		);


        const nap =
            dashboard.nap &&
            dashboard.nap.active
                ? dashboard.nap
                : null;

        const best =
            dashboard.bestOpportunity;

        const liveDayEl =
            document.getElementById(
                "live-day"
            );

        const cardDate =
            dashboard?.raceCardDate;

        if (
            liveDayEl &&
            cardDate
        ) {

            const date =
                new Date(
                    `${cardDate}T12:00:00`
                );

            if (
                !Number.isNaN(
                    date.getTime()
                )
            ) {

                liveDayEl.textContent =
                    new Intl.DateTimeFormat(
                        "en-GB",
                        {
                            weekday:
                                "long",

                            day:
                                "numeric",

                            month:
                                "long",

                            year:
                                "numeric",

                            timeZone:
                                "Europe/London"
                        }
                    ).format(
                        date
                    );
            }
        }




		const hero = best;

		// A race link (#course-HHMM, from a glance-row click or a shared link)
		// wins over the Best Opportunity - opening the hero race first used to
		// overwrite the hash and land on the wrong race (2026-10-18).
		const deepLink = readDeepLink();

        renderNapCallout(nap);

        applyBestOpportunityBadge(hero);

        if (
            hero &&
            !deepLink &&
            hero.meetingId != null &&
            hero.raceIndex != null
        ) {

            const goToHeroRace =
                async () => {

                    await loadRaces(
                        hero.meetingId,
                        hero.course,
                        false
                    );

                    await loadRace(
                        hero.meetingId,
                        hero.raceIndex,
                        toLocalTimeString(
                            hero.raceTime
                        )
                    );
                };

            goToHeroRace();

        }
		












        if (
            dashboard.raceTimes
        ) {

			window.allRaceTimes =
				dashboard.raceTimes
					.map(r => ({
						course:
							r.course,

						displayTime:
							toLocalTimeString(
								r.time
							),

						totalSecs:
							parseLondonTimeToSeconds(
								r.time
							),

						meetingId:
							r.meetingId,

						raceIndex:
							r.raceIndex
					}))
					.sort(
						(a, b) =>
							a.totalSecs -
							b.totalSecs
					);

            if (
                !window.timerPool?.liveClock &&
                typeof updateClock ===
                    "function"
            ) {

                window.timerPool ??= {};

                window.timerPool.liveClock =
                    setInterval(
                        updateClock,
                        1000
                    );

                updateClock();
            }
        }


        await loadMeetings(!hero || !!deepLink);
		
        loadTodaysResults();

        setInterval(
            loadTodaysResults,
            300000
        );

        loadMarketMoves();
        setInterval(loadMarketMoves, 300000);

        loadGlance();
        setInterval(loadGlance, 300000);

        loadUpdatedStamp();
        setInterval(loadUpdatedStamp, 60000);

        loadRecord();
        setInterval(loadRecord, 300000);

        // The NAP countdown and Coming up move with the clock (user 2026-11-05).
        setInterval(() => { tickNapCountdown(); renderComingUp(); }, 30000);

        startLiveRefresh();

    } catch (err) {

        console.error(
            "Error loading dashboard:",
            err
        );
    }
}

// ------------------------------------------------------------------
// LIVE REFRESH
//
// Picks change during the day (15min odds refresh, non-runners, the
// market-override rule) but everything above loads once, so a tab left
// open kept showing stale picks until manually reloaded. This re-pulls
// the dashboard (candidates, Daily Double, NAP, Best Opportunity) and the
// open race every 5 minutes, and straight away when the tab comes back
// into view. Deliberately NOT loadDashboard() again - that would stack
// timers and jump the visitor to the hero race.
// ------------------------------------------------------------------

const LIVE_REFRESH_MS = 300000;
let liveRefreshInFlight = false;
let lastLiveRefresh = Date.now();

// A tab left open overnight still holds yesterday's races; the race it has
// open no longer exists, so every refresh logged a 404 (27 Oct: 324 console
// errors on a tab opened 25 Oct). On a new UK day, reload the page instead -
// that also picks up any newer site version.
const ukDateNow = () => new Date().toLocaleDateString("en-GB", { timeZone: "Europe/London" });
const pageUkDate = ukDateNow();

async function refreshLiveData() {

    if (liveRefreshInFlight || document.hidden) return;

    if (ukDateNow() !== pageUkDate) {
        location.reload();
        return;
    }
    liveRefreshInFlight = true;
    lastLiveRefresh = Date.now();

    try {

        const response = await getDashboard();

        if (response?.success) {
            const dashboard = response.dashboard;
            renderCandidateBoard(dashboard);
            renderDailyDouble(dashboard);
            renderYesterdayResults(dashboard);
            renderNapCallout(
                dashboard.nap && dashboard.nap.active ? dashboard.nap : null
            );
            applyBestOpportunityBadge(dashboard.bestOpportunity);
        }

        // Redraw the open race only if something visible changed, and
        // keep the visitor's scroll position.
        const ctx = window.currentRaceContext;

        if (ctx?.meetingId != null && ctx.raceIndex != null) {

            // A result that has just appeared (or gone) for the open race: redraw.
            const hasResultNow = !!(await findResultDetail(ctx.courseName, ctx.raceTime));
            if (hasResultNow !== !!ctx.hasResult && window.currentRaceContext === ctx) {
                const scrollY0 = window.scrollY;
                await loadRace(ctx.meetingId, ctx.raceIndex, ctx.displayTime, { silent: true });
                window.scrollTo(0, scrollY0);
                return;
            }

            const race = await getRace(ctx.meetingId, ctx.raceIndex);

            if (
                race?.success &&
                raceSignature(race) !== ctx.signature &&
                window.currentRaceContext === ctx
            ) {
                const scrollY = window.scrollY;
                await loadRace(ctx.meetingId, ctx.raceIndex, ctx.displayTime, {
                    silent: true,
                    prefetched: race
                });
                window.scrollTo(0, scrollY);
            }
        }

    } catch (err) {
        // Background enrichment - the page already shows the last good data.
        console.warn("Live refresh failed:", err);
    } finally {
        liveRefreshInFlight = false;
    }

}

function startLiveRefresh() {

    window.timerPool ??= {};
    if (window.timerPool.liveRefresh) return;

    window.timerPool.liveRefresh =
        setInterval(refreshLiveData, LIVE_REFRESH_MS);

    // Returning to a tab after a while: refresh at once rather than
    // waiting for the next tick (but not on quick tab flicks).
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && Date.now() - lastLiveRefresh > 60000) {
            refreshLiveData();
        }
    });

}

function updateResultsStripVisibility() {

    const strip = document.getElementById("todaysResultsStrip");
    if (!strip) return;

    const todayBlock = document.getElementById("todayResultsBlock");
    const hasContent = todayBlock && todayBlock.innerHTML.trim() !== "";

    strip.style.display = hasContent ? "" : "none";

}

function renderYesterdayResults(dashboard) {

    const block = document.getElementById("dailyDoubleYesterday");
    if (!block) return;

    const y = dashboard?.yesterdayResults;
    const picks = Array.isArray(y?.dailyDouble) ? y.dailyDouble : [];
    const withOutcome = picks.filter(p => p.outcome && p.outcome !== "unknown");

    if (!withOutcome.length) {
        block.innerHTML = "";
        return;
    }

    // "void" = a leg shown as NO BET because the market moved away from it
    // by the off (2026-10-22) - listed, but not counted as a bet.
    const bets = withOutcome.filter(p => p.outcome !== "void");
    const won = bets.filter(p => p.outcome === "won").length;
    const placed = bets.filter(p => p.outcome === "won" || p.outcome === "placed").length;

    const detail = withOutcome.map(p => {
        if (p.outcome === "void") return `– <s>${escapeHtml(p.horse)}</s> (no bet)`;
        const icon = p.outcome === "won" ? "\u2705" : p.outcome === "placed" ? "\u2713" : "\u2717";
        return `${icon} ${escapeHtml(p.horse)}`;
    }).join(" &nbsp;\u00b7&nbsp; ");

    const label = y?.pickMode === "single"
        ? "Yesterday's Daily Single"
        : "Yesterday's Daily Double";

    block.innerHTML = `
        <div class="results-strip-summary">
            <span class="results-strip-label">${label}</span>
            ${bets.length ? `<span class="results-strip-stat results-strip-win">${won}/${bets.length} won</span>
            <span class="results-strip-stat results-strip-place">${placed}/${bets.length} placed</span>` : `<span class="results-strip-stat">no bet - void</span>`}
        </div>
        <div class="results-strip-recent">${detail}</div>
    `;

}

// ---------------------------------------------------------------------------
// Market movers and today's non-runners (2026-10-11). /api/moves is rebuilt every
// odds refresh from the bookmaker price history: the runners whose price has moved
// most since the first live price of the day, and every withdrawal on the card.
// It reports what the market did; it is not a tip.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Card at a glance (2026-10-11): every race today, our pick against the market
// favourite, on one screen. Click a row to open that race.
// ---------------------------------------------------------------------------
// "Updated HH:MM" under the clock (user 2026-11-05): the site is static since
// 5 Nov, its data rebuilt every 10 minutes by the home computer's odds refresh
// (data/built.json). Over 25 minutes old shows in red - the refresh has stopped.
async function loadUpdatedStamp() {
    const el = document.getElementById("data-updated");
    if (!el) return;
    try {
        const r = await fetch(`data/built.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const at = Date.parse((await r.json()).builtAt);
        if (!Number.isFinite(at)) return;
        const hhmm = new Date(at).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
        const mins = Math.round((Date.now() - at) / 60000);
        const late = mins > 25;
        el.textContent = late ? `Updated ${hhmm} - ${mins >= 120 ? Math.round(mins / 60) + " hours" : mins + " min"} ago, may be out of date` : `Updated ${hhmm}`;
        el.classList.toggle("topbar-updated-late", late);
    } catch { /* keep the last stamp */ }
}

// Running record under the Daily Double (user 2026-11-05): NAPs at SP and the
// Daily Double, built by js/buildStaticSite.js.
async function loadRecord() {
    const el = document.getElementById("recordBlock");
    if (!el) return;
    try {
        const r = await fetch(`data/record.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const money = v => (v < 0 ? "-" : "+") + "£" + Math.abs(v).toFixed(2);
        const since = iso => iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
        const pct = (a, b) => b ? Math.round(100 * a / b) + "%" : "-";
        const rows = [];
        if (d.nap?.settled) rows.push(`<div class="record-row"><b>NAPs</b> ${d.nap.won} won of ${d.nap.settled} (${pct(d.nap.won, d.nap.settled)}) &middot; <span class="${d.nap.pl < 0 ? "record-minus" : "record-plus"}">${money(d.nap.pl)}</span> to £1 stakes at SP <span class="record-since">since ${since(d.nap.from)}</span></div>`);
        // Real Matchbook bets not shown (user 2026-11-05).
        if (d.dailyDouble?.days) rows.push(`<div class="record-row"><b>Daily Double</b> ${d.dailyDouble.won} won of ${d.dailyDouble.days} days (${pct(d.dailyDouble.won, d.dailyDouble.days)}) <span class="record-since">since ${since(d.dailyDouble.from)}</span></div>`);
        // NAP rule forward test: its own panel below (user 2026-11-06).
        // Best Odds Guaranteed paper test (user 2026-11-05): no money, £1 a bet.
        const bog = d.bogTest;
        if (bog) {
            const live = bog.bets ? `${bog.won} won of ${bog.bets} &middot; <span class="${bog.pl < 0 ? "record-minus" : "record-plus"}">${bog.pl < 0 ? "-" : "+"}${Math.abs(bog.pl).toFixed(2)} pts</span> with BOG${bog.noBogRoiPct != null ? ` (${bog.roiPct}%; without BOG ${bog.noBogRoiPct}%)` : ""}` : "first bets from 09:00";
            rows.push(`<div class="record-row"><b>Best Odds Guaranteed test</b> ${live} <span class="record-since">${bog.bets}/${bog.passAt} bets${bog.verdict ? ` - ${bog.verdict}` : ""}. Our top-rated at evens to 4/1, paid the bigger of the 9am price and the SP. No valid past test - this is the first real one</span></div>`);
        }
        // Extra places paper test (user 2026-11-06): no money, £1 each way a bet.
        const ep = d.extraPlacesTest;
        if (ep) {
            const live = ep.bets ? `${ep.won} won, ${ep.placed} placed of ${ep.bets} &middot; <span class="${ep.pl < 0 ? "record-minus" : "record-plus"}">${ep.pl < 0 ? "-" : "+"}${Math.abs(ep.pl).toFixed(2)} pts</span> (${ep.roiPct}%; on standard terms ${ep.standardRoiPct}%)` : "first bets from 09:00";
            rows.push(`<div class="record-row"><b>Extra places test</b> ${live} <span class="record-since">${ep.bets}/${ep.passAt} bets${ep.verdict ? ` - ${ep.verdict}` : ""}. Our top-rated each way, at the 9am price, in races where a bookmaker pays an extra place</span></div>`);
        }
        renderLastNap(d.lastNap);
        renderRuleTest(d.ruleTest, d.realBetsPaused);
        if (!rows.length) { el.style.display = "none"; return; }
        el.innerHTML = `<div class="results-strip-label">Running record</div>${rows.join("")}`;
        el.style.display = "";
    } catch { /* keep the last record */ }
}

// NAP rule test progress (user 2026-11-06 "show the NAP rule test progress"):
// js/napRuleTest.js locks each rule's pick at 9am and settles it at Betfair SP
// after 5%; a rule passes in profit after passAt picks and in both halves.
function renderRuleTest(rt, paused) {
    const el = document.getElementById("ruleTestBlock");
    if (!el) return;
    const rules = Object.entries(rt?.rules || {});
    if (!rules.length) { el.style.display = "none"; return; }
    const pts = v => `<span class="${v < 0 ? "record-minus" : "record-plus"}">${v < 0 ? "-" : "+"}${Math.abs(v).toFixed(2)} pts</span>`;
    const day = iso => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
    const res = p => !p ? `<span class="record-since">no horse cleared the bar</span>`
        : p.outcome === "won" ? `<span class="record-plus">won</span> SP ${p.bsp}`
        : p.outcome === "lost" ? `<span class="record-minus">lost</span> SP ${p.bsp}`
        : p.outcome === "void" ? `<span class="record-since">void (non-runner)</span>` : `<span class="record-since">to run</span>`;
    const pick = p => p ? `<b>${escapeHtml(p.horse)}</b> <span class="record-since">${escapeHtml(p.course)} ${escapeHtml(p.time)} &middot; ${escapeHtml(p.odds)}</span> ${res(p)}` : res(p);
    const cards = rules.map(([k, t]) => {
        const pct = Math.min(100, Math.round(100 * t.picks / (t.passAt || 100)));
        const halves = t.picks >= 2 ? t.halves.map((h, i) => `<span class="${h > 0 ? "record-plus" : "record-minus"}">${i ? "2nd" : "1st"} half ${h > 0 ? "+" : ""}${h}%</span>`).join(" ") : "";
        const verdict = t.verdict ? `<span class="rule-test-verdict rule-test-${t.verdict.toLowerCase()}">${t.verdict}</span>` : "";
        const bt = t.backtest || {};
        return `<div class="rule-test-rule">
            <div class="rule-test-head"><b>${escapeHtml(k)}. ${escapeHtml(t.rule)}</b>${verdict}</div>
            <div class="rule-test-bar"><span style="width:${pct}%"></span></div>
            <div class="record-since">${t.picks} of ${t.passAt} picks settled</div>
            <div class="record-row">${t.picks ? `${t.won} won (${Math.round(100 * t.won / t.picks)}%) &middot; ${pts(t.pl)} &middot; ${t.roiPct > 0 ? "+" : ""}${t.roiPct}% a bet` : "No picks settled yet"}</div>
            ${halves || t.currentRun ? `<div class="record-row">${halves}${t.currentRun ? ` <span class="record-since">&middot; ${t.currentRun} lost in a row</span>` : ""}</div>` : ""}
            <div class="record-since">In testing: won ${bt.wonPct}%, ${bt.roiPct > 0 ? "+" : ""}${bt.roiPct}% &plusmn;${bt.range}, losing runs up to ${bt.losingRun}</div>
        </div>`;
    }).join("");
    const recent = rt.recent || [];
    const todayRow = recent.find(d => d.date === today);
    const todayHtml = todayRow
        ? rules.map(([k]) => `<div class="record-row">${escapeHtml(k)}: ${pick(todayRow.picks[k])}</div>`).join("")
        : `<div class="record-row record-since">Today's picks lock at 9am.</div>`;
    const past = recent.filter(d => d.date !== today);
    const pastHtml = past.length ? `<div class="rule-test-sub">Recent picks</div><table class="rule-test-table"><tbody>${past.map(d =>
        `<tr><td class="record-since">${day(d.date)}</td>${rules.map(([k]) => `<td>${escapeHtml(k)}: ${pick(d.picks[k])}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "";
    el.innerHTML = `<div class="results-strip-label">NAP rule test</div>
        <div class="record-since">Two ways of choosing the NAP, on trial since ${day(String(rt.startedAt).slice(0, 10))}. Each picks one horse at 9am, settled at Betfair SP after 5%, £1 a pick. To pass, a rule must be in profit after ${rules[0][1].passAt} picks and in both halves.${paused ? " Real-money bets stay paused until one passes." : ""}</div>
        <div class="rule-test-rules">${cards}</div>
        <div class="rule-test-sub">Today</div>${todayHtml}${pastHtml}`;
    el.style.display = "";
}

// "Yesterday's NAP: MACANUDO 2nd at 7/2" under today's NAP (user 2026-11-05):
// the last settled NAP before today, from data/record.json.
function renderLastNap(n) {
    const el = document.getElementById("napYesterday");
    if (!el) return;
    if (!n?.name) { el.innerHTML = ""; return; }
    const y = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
    const label = n.date === y ? "Yesterday's NAP"
        : "Last NAP (" + new Date(n.date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + ")";
    const ord = p => p + (p % 100 >= 11 && p % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[p % 10] || "th"));
    const sp = n.sp ? ` at ${escapeHtml(n.sp)}` : "";
    const how = n.outcome === "won" ? `<span class="record-plus">won</span>${sp}`
        : `<span class="record-minus">${n.position ? ord(n.position) : "lost"}</span>${sp}${n.winner ? ` &middot; won by ${escapeHtml(n.winner)}${n.winnerSp ? ` (${escapeHtml(n.winnerSp)})` : ""}` : ""}`;
    el.innerHTML = `<span class="results-strip-label">${label}</span> <b>${escapeHtml(String(n.name).toUpperCase())}</b> ${how}`;
}

// Coming up (user 2026-11-05): the next races on the whole card with our pick
// and the favourite, in the space under the race buttons. Built from the Card
// at a glance data; a click opens the race the same way a glance row does.
let glanceData = null;
function renderComingUp() {
    const box = document.getElementById("comingUp");
    if (!box) return;
    const d = glanceData;
    const now = Date.now();
    const offOf = x => Date.parse(d.date + "T" + x.time + ":00Z");
    const next = (d?.races || []).filter(x => offOf(x) > now).slice(0, 6);
    if (!next.length) { box.innerHTML = ""; return; }
    box.innerHTML = "<div class='coming-up-label'>Coming up</div>" + next.map(x => {
        const t = toLocalTimeString(x.time);
        const mins = Math.ceil((offOf(x) - now) / 60000);
        const inText = mins >= 60 ? Math.floor(mins / 60) + "h " + (mins % 60) + "m" : mins + "m";
        const fav = x.agree ? "<span class='glance-yes'>Also the favourite</span>"
            : x.fav ? "Favourite " + escapeHtml(x.fav) + " <span class='glance-odds'>" + escapeHtml(x.favOdds || "") + "</span>" + (x.jointFav ? " <i>(joint)</i>" : "") : "";
        const silk = x.pickSilk
            ? "<img src='" + escapeHtml(x.pickSilk) + "' class='coming-up-silk' alt='' loading='lazy' onerror=\"this.style.visibility='hidden';\">"
            : "<span class='coming-up-silk'></span>";
        return "<div class='coming-up-row' data-hash='" + escapeHtml(raceHash(x.course, t)) + "'>" +
            "<div class='coming-up-time'><b>" + escapeHtml(t) + "</b><span>" + escapeHtml(x.course) + "</span></div>" + silk +
            "<div class='coming-up-pick'><b>" + escapeHtml(x.pick) + "</b> <span class='glance-odds'>" + escapeHtml(x.pickOdds || "") + "</span>" +
            "<div class='coming-up-fav'>" + fav + "</div></div>" +
            "<div class='coming-up-in'>" + inText + "</div></div>";
    }).join("");
    box.querySelectorAll(".coming-up-row").forEach(row => row.addEventListener("click", () => {
        location.hash = row.dataset.hash;
        location.reload();
    }));
}

async function loadGlance() {
    const box = document.getElementById("glanceBox");
    const body = document.getElementById("glanceBody");
    if (!box || !body) return;
    try {
        const r = await fetch(`data/glance.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        glanceData = d;
        renderComingUp();
        const races = d.races || [];
        if (!races.length) { box.style.display = "none"; return; }
        const now = Date.now();
        const agree = races.filter(x => x.agree).length;
        document.getElementById("glanceSummary").textContent =
            "Card at a glance - " + races.length + " races, our pick is also the market favourite in " + agree;
        const rows = races.map(x => {
            const off = now >= Date.parse(d.date + "T" + x.time + ":00Z");
            const t = toLocalTimeString(x.time);
            const hash = raceHash(x.course, t);
            const favCell = x.agree ? "<span class='glance-yes' title='Our pick is the market favourite'>Same</span>" : x.fav ? escapeHtml(x.fav) + " <span class='glance-odds'>" + escapeHtml(x.favOdds) + "</span>" + (x.jointFav ? " <i>(joint)</i>" : "") : "-";
            return "<tr class='glance-row" + (off ? " glance-off" : "") + "' data-hash='" + escapeHtml(hash) + "'>" +
                "<td>" + escapeHtml(t) + "</td><td>" + escapeHtml(x.course) + "</td>" +
                "<td>" + (x.pickSilk ? "<img src='" + escapeHtml(x.pickSilk) + "' class='glance-silk' alt='' loading='lazy' onerror=\"this.style.display='none';\">" : "") + "<b>" + escapeHtml(x.pick) + "</b> <span class='glance-odds'>" + escapeHtml(x.pickOdds || "") + "</span></td>" +
                "<td>" + favCell + "</td></tr>";
        }).join("");
        body.innerHTML = "<div class='glance-wrap'><table class='glance-table'><thead><tr><th>Time</th><th>Course</th><th>Our pick</th><th>Favourite</th></tr></thead><tbody>" +
            rows + "</tbody></table></div><div class='market-note'>Faded rows have already run. Click a row to open that race.</div>";
        body.querySelectorAll("tr.glance-row").forEach(tr => tr.addEventListener("click", () => {
            location.hash = tr.dataset.hash;
            location.reload();
        }));
        box.style.display = "";
    } catch (err) {
        console.warn("Card at a glance unavailable:", err);
    }
}

async function loadMarketMoves() {
    const el = document.getElementById("marketStrip");
    if (!el) return;
    try {
        const r = await fetch(`data/moves.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        // Drop rows for races that have gone off since the feed was built (card times are UTC).
        const stillToRun = x => !d.date || !x || !x.time || Date.parse(d.date + "T" + x.time + ":00Z") > Date.now();
        const nrAll = (d.nonRunners || []).filter(stillToRun), shortAll = (d.shorteners || []).filter(stillToRun), driftAll = (d.drifters || []).filter(stillToRun);
        // Keep the strip short: the biggest few moves only (the API sends them largest first).
        const nr = nrAll.slice(0, 8), short = shortAll.slice(0, 5), drift = driftAll.slice(0, 4);
        const more = (all, shown) => all.length > shown.length ? '<span class="market-more">+' + (all.length - shown.length) + ' more</span>' : "";
        if (!nr.length && !short.length && !drift.length) {
            el.style.display = "none";
            el.innerHTML = "";
            return;
        }
        const when = x => escapeHtml(toLocalTimeString(x.time));
        const move = (x, dir) => '<span class="market-chip market-chip-' + dir + '"><b>' + escapeHtml(x.horse) + '</b> <i>' + escapeHtml(x.course) + ' ' + when(x) + '</i> ' +
            '<span class="market-price">' + (dir === "in" ? "&#9660; " : "&#9650; ") + escapeHtml(x.from) + ' &rarr; ' + escapeHtml(x.to) + '</span></span>';
        const rows = [];
        if (nr.length) {
            rows.push('<div class="market-row"><span class="market-label market-label-nr">Non-runners</span>' +
                nr.map(x => '<span class="market-chip market-chip-nr"><b>' + escapeHtml(x.horse) + '</b> <i>' + escapeHtml(x.course) + ' ' + when(x) + '</i></span>').join("") + more(nrAll, nr) + '</div>');
        }
        if (short.length) {
            rows.push('<div class="market-row"><span class="market-label market-label-in">Shortening</span>' + short.map(x => move(x, "in")).join("") + more(shortAll, short) + '</div>');
        }
        if (drift.length) {
            rows.push('<div class="market-row"><span class="market-label market-label-out">Drifting</span>' + drift.map(x => move(x, "out")).join("") + more(driftAll, drift) + '</div>');
        }
        // Collapsible, closed on every page load (user 2026-11-05; was open on wide
        // screens) - the summary line keeps the counts. A refresh keeps whatever
        // the visitor chose.
        const prev = el.querySelector("details");
        const open = prev ? prev.open : false;
        const parts = [];
        if (nrAll.length) parts.push(nrAll.length + (nrAll.length === 1 ? " non-runner" : " non-runners"));
        const nMoves = shortAll.length + driftAll.length;
        if (shortAll.length) parts.push('<span class="market-count-in">&#9660; ' + shortAll.length + ' shortening</span>');
        if (driftAll.length) parts.push('<span class="market-count-out">&#9650; ' + driftAll.length + ' drifting</span>');
        el.innerHTML = '<details class="market-details"' + (open ? " open" : "") + '><summary>Market watch &middot; ' + parts.join(" &middot; ") + '</summary>' + rows.join("") +
            '<div class="market-note">Bookmaker price moves since the first live price today (races still to run). What the market did, not a tip.</div></details>';
        el.style.display = "";
    } catch (err) {
        console.warn("Market moves unavailable:", err);
    }
}

// ---------------------------------------------------------------------------
// Shareable race links (2026-10-11): #naas-1320 opens that race (UK time). The
// address bar follows the race being viewed, so any race can be copied and sent.
// ---------------------------------------------------------------------------
function slugOf(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function raceHash(course, displayTime) {
    return "#" + slugOf(course) + "-" + String(displayTime).replace(":", "");
}
function readDeepLink() {
    const m = String(location.hash || "").match(/^#([a-z0-9-]+)-(\d{4})$/);
    return m ? { slug: m[1], time: m[2] } : null;
}

async function loadTodaysResults() {

    try {

        const response =
            await fetch(
                `data/checkResults.json?t=${Date.now()}`, { cache: "no-store" }
            );

        const strip =
            document.getElementById(
                "todaysResultsStrip"
            );

        if (!strip) {
            return;
        }

        const todayBlock =
            document.getElementById(
                "todayResultsBlock"
            );

        if (!response.ok) {

            if (todayBlock) todayBlock.innerHTML = "";
            updateResultsStripVisibility();

            return;
        }

        const data =
            await response.json();

        if (
            !data.success ||
            !data.racesChecked
        ) {

            if (todayBlock) todayBlock.innerHTML = "";
            updateResultsStripVisibility();

            return;
        }

        const winRate =
            (
                data.topPickWins /
                data.racesChecked *
                100
            ).toFixed(1);

        const placeRate =
            (
                data.topPickPlaces /
                data.racesChecked *
                100
            ).toFixed(1);

        const recentDetails =
            (
                data.details || []
            )
                .slice(-5)
                .reverse();

        // Races on today's card, for "12 of 51 races run". A nicety: if the
        // call fails the strip just says "12 races run".
        let totalRaces = 0;
        try {
            const m = await getMeetings();
            if (m?.success) {
                totalRaces = m.meetings.reduce((s, x) => s + (Number(x.raceCount) || 0), 0);
            }
        } catch { /* keep 0 */ }

 let todayBlockEl = document.getElementById("todayResultsBlock");
if (!todayBlockEl) {
    todayBlockEl = document.createElement("div");
    todayBlockEl.id = "todayResultsBlock";
    strip.appendChild(todayBlockEl);
}

todayBlockEl.innerHTML = `

            <div class="results-strip-summary">

                <span class="results-strip-label">
                    Day so far (live)
                </span>

                <span class="results-strip-stat">
                    ${totalRaces >= data.racesChecked
                        ? `${data.racesChecked} of ${totalRaces} races run`
                        : `${data.racesChecked} races run`}
                </span>

                <span class="results-strip-stat results-strip-win" title="Races where our published pick won">
                    Our pick won ${data.topPickWins}
                    (${winRate}%)
                </span>

                <span class="results-strip-stat results-strip-place" title="Won or placed, using each-way place terms for the field size">
                    placed ${data.topPickPlaces}
                    (${placeRate}%)
                </span>

                ${
                    data.yesterday
                        ? `
                            <span class="results-strip-divider">│</span>
                            <span class="results-strip-label results-strip-yesterday-label">Yesterday</span>
                            <span class="results-strip-stat">
                                ${data.yesterday.racesChecked} races
                            </span>
                            <span class="results-strip-stat results-strip-win">
                                Our pick won ${data.yesterday.topPickWins}
                                (${(data.yesterday.topPickWins / data.yesterday.racesChecked * 100).toFixed(1)}%)
                            </span>
                            <span class="results-strip-stat results-strip-place">
                                placed ${data.yesterday.topPickPlaces}
                                (${(data.yesterday.topPickPlaces / data.yesterday.racesChecked * 100).toFixed(1)}%)
                            </span>
                        `
                        : ""
                }

            </div>

            ${
                recentDetails.length
                    ? `
                        <div class="results-strip-recent">

                            ${
                                recentDetails
                                    .map(
                                        d => `
                                            <span
                                                class="results-strip-race results-strip-${escapeHtml(
                                                    d.outcome
                                                )}"
                                            >
                                                ${escapeHtml(
                                                    d.course
                                                )}
                                                ${escapeHtml(
                                                    toLocalTimeString(
                                                        d.time
                                                    )
                                                )}
                                                -
                                                ${escapeHtml(
                                                    d.ourPick
                                                )}
                                                ${
                                                    d.outcome === "won"
                                                        ? "won"
                                                        : d.ourPickPosition
                                                            ? escapeHtml(ordinal(d.ourPickPosition))
                                                            : `(${escapeHtml(d.outcome)})`
                                                }

                                                ${
                                                    d.outcome !==
                                                        "won" &&
                                                    d.actualWinner
                                                        ? `
                                                            &nbsp;→&nbsp;
                                                            Winner:
                                                            ${escapeHtml(
                                                                d.actualWinner
                                                            )}${(() => {
                                                                const w = resultPlaces(d).find(p => Number(p.position) === 1);
                                                                return w && w.odds ? " " + escapeHtml(w.odds) : "";
                                                            })()}
                                                          `
                                                        : ""
                                                }

                                            </span>
                                        `
                                    )
                                    .join("")
                            }

                        </div>
                      `
                    : ""
            }

        `;

        updateResultsStripVisibility();

    } catch (err) {

        console.error(
            "Error loading today's results:",
            err
        );
    }
}

async function loadMeetings(autoSelectFirst = false) {

    try {

        const response =
            await getMeetings();

        if (!response.success) {
            return;
        }

        const container =
            document.getElementById(
                "meetings"
            );

        container.innerHTML =
            "";

        response.meetings.forEach(
            meeting => {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "meeting-card";

                card.dataset.meetingId =
                    meeting.id;

                card.innerHTML = `

                    <span class="meeting-card-name">
                        ${escapeHtml(
                            meeting.name
                        )}
                    </span>

                    <span class="meeting-card-count">
                        ${Number(meeting.raceCount) > 0
                            ? escapeHtml(meeting.raceCount)
                            : "Abandoned"}
                    </span>

                `;

                // A meeting with no races (abandoned - 2026-10-03: "Warwick 0"
                // on 30 Sep) gets no click handler: it would only open an
                // empty race list.
                if (!(Number(meeting.raceCount) > 0)) {
                    card.classList.add("meeting-card-empty");
                    card.style.opacity = "0.55";
                    card.style.cursor = "default";
                    card.title = "No races - meeting abandoned";
                } else card.addEventListener(
                    "click",
                    () => {

                        container
                            .querySelectorAll(
                                ".meeting-card"
                            )
                            .forEach(
                                el =>
                                    el.classList.remove(
                                        "active"
                                    )
                            );

                        card.classList.add(
                            "active"
                        );

                        loadRaces(
                            meeting.id,
                            meeting.name
                        );
                    }
                );

                container.appendChild(
                    card
                );
            }
        );


		markSelected();   // the buttons are drawn after the first race has opened

		if (
			autoSelectFirst &&
			response.meetings.length
		) {

			// First meeting that actually has races (2026-10-03) - an
			// abandoned meeting first in the list used to open an empty page.
			const link = readDeepLink();
			const linked = link
				? response.meetings.find(m => Number(m.raceCount) > 0 && slugOf(m.name) === link.slug)
				: null;
			window.__deepLinkTime = linked ? link.time : null;

			const first =
				linked || response.meetings.find(m => Number(m.raceCount) > 0);

			const firstCard = first
				? container.querySelector(`.meeting-card[data-meeting-id="${first.id}"]`)
				: null;

			if (firstCard) {
				firstCard.classList.add("active");
			}

			if (first) {
				loadRaces(
					first.id,
					first.name
				);
			}

		}



    } catch (err) {

        console.error(
            "Error loading meetings:",
            err
        );
    }
}









