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
    bounceProfile: "BP"
};

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

    const parts = String(timeStr).split(":");

    if (parts.length < 2) return 0;

    let hours = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);

    const now = new Date();

    const isBST =
        Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone: "Europe/London",
                timeZoneName: "short"
            }
        )
        .format(now)
        .includes("BST");

    if (isBST) {
        hours = (hours + 1) % 24;
    }

    return (hours * 3600) + (mins * 60);
}

const TIER_STRONG_CUT = 0.50;
const TIER_MODERATE_CUT = 0.30;
const TIER_MIN_FIELD_FOR_STRONG = 5;
const TIER_MIN_ABSOLUTE_MARGIN = 1.0;

function raceMarginTier(runners) {

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

    const tier =
        (
            relativeMargin >= TIER_STRONG_CUT &&
            ratings.length >= TIER_MIN_FIELD_FOR_STRONG
        )
            ? "Strong"
            : relativeMargin >= TIER_MODERATE_CUT
                ? "Moderate"
                : "Open";

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
        move.evidence.split(" â†’ ");

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
            ? "â–¼"
            : move.answer === "Drifter"
                ? "â–²"
                : "â€“";

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
            ðŸ”´ LIVE: ${escapeHtml(move.answer)}
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

function buildEngineBreakdownPanel(engineDetails) {

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

    return `
        <div class="engine-panel">
            <div class="engine-panel-note">
                These four combine to set the ELITE rating shown above.
                The checklist below only ever breaks an exact tie between two runners.
            </div>
            ${rows}
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

function startLiveTicker(dashboard) {

    const ticker =
        document.getElementById(
            "live-ticker-content"
        );

    if (!ticker) {
        return;
    }

    const items = [];

    const raceTimes =
        Array.isArray(
            dashboard?.raceTimes
        )
            ? dashboard.raceTimes
            : [];

    const nowSeconds =
        getLondonNowSeconds();

    const upcoming =
        raceTimes
            .map(r => ({
                ...r,
                displayTime:
                    toLocalTimeString(r.time),
                totalSecs:
                    parseLondonTimeToSeconds(
                        r.time
                    )
            }))
            .filter(
                r =>
                    r.totalSecs >=
                    nowSeconds
            )
            .sort(
                (a, b) =>
                    a.totalSecs -
                    b.totalSecs
            );

    if (upcoming.length) {

        const next =
            upcoming[0];

        items.push({
            html:
                `<span class="ticker-item">` +
                    `<span class="ticker-next">UP NEXT:</span>` +
                    `<span>${escapeHtml(next.course)}</span>` +
                    `<strong>${escapeHtml(next.displayTime)}</strong>` +
                `</span>`
        });

        if (upcoming[1]) {

            items.push({
                html:
                    `<span class="ticker-item">` +
                        `<span class="ticker-next">THERE AFTER:</span>` +
                        `<span>${escapeHtml(upcoming[1].course)}</span>` +
                        `<strong>${escapeHtml(upcoming[1].displayTime)}</strong>` +
                    `</span>`
            });
        }
    }

    const rawBest =
        dashboard?.bestOpportunity;

    if (rawBest) {

        const best = {

            horse:
                rawBest.horse ??
                rawBest.name ??
                "-",

            rating:
                rawBest.rating ??
                null,

            course:
                rawBest.course ??
                rawBest.meeting ??
                "",

            raceTime:
                rawBest.raceTime ??
                rawBest.time ??
                null
        };

        items.push({
            html:
                `<span class="ticker-item">` +

                    `<span class="ticker-best">` +
                        `★ BEST OPPORTUNITY` +
                    `</span>` +

                    `<span class="ticker-horse">` +
                        `${escapeHtml(best.horse)}` +
                    `</span>` +

                    `<span class="ticker-rating">` +
                        `EPR ${escapeHtml(String(best.rating ?? "-"))}` +
                    `</span>` +

                    `<span class="ticker-course">` +
                        `${escapeHtml(best.course)}` +
                        `${
                            best.raceTime
                                ? ` ${escapeHtml(
                                    toLocalTimeString(
                                        best.raceTime
                                    )
                                )}`
                                : ""
                        }` +
                    `</span>` +

                `</span>`
        });
    }

    if (upcoming.length >= 3) {

        const sequence =
            upcoming
                .slice(0, 3)
                .map(r =>
                    `<span class="ticker-race">` +
                        `<span class="ticker-course">${escapeHtml(r.course)}</span>` +
                        `<strong>${escapeHtml(r.displayTime)}</strong>` +
                    `</span>`
                )
                .join(
                    `<span class="ticker-separator">•</span>`
                );

        items.push({
            html:
                `<span class="ticker-item">` +
                    `<span class="ticker-next">RACE BOARD</span>` +
                    sequence +
                `</span>`
        });
    }

    if (!items.length) {

        ticker.textContent =
            "No upcoming races";

        return;
    }

    let index = 0;

    const showItem = () => {

        ticker.classList.remove(
            "ticker-entering"
        );

        ticker.classList.add(
            "ticker-changing"
        );

        setTimeout(() => {

            ticker.innerHTML =
                items[index].html;

            ticker.classList.remove(
                "ticker-changing"
            );

            ticker.classList.add(
                "ticker-entering"
            );

            requestAnimationFrame(() => {

                requestAnimationFrame(() => {

                    ticker.classList.remove(
                        "ticker-entering"
                    );

                });

            });

            index =
                (index + 1) %
                items.length;

        }, 350);
    };

    ticker.innerHTML =
        items[0].html;

    index = 1;

    ticker.classList.remove(
        "ticker-changing",
        "ticker-entering"
    );

    clearInterval(
        window.timerPool?.liveTicker
    );

    window.timerPool ??= {};

    window.timerPool.liveTicker =
        setInterval(
            showItem,
            6000
        );
}

// ============================================================
// TODAY'S BETTING CANDIDATES BOARD
// ============================================================
//
// Strong Candidates = primary selections
// Worth Considering = credible alternatives
//
// The dashboard service supplies these arrays.
// This function does NOT recalculate ratings.
//
// ============================================================

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
    HERO HORSES â€” CHRONOLOGICAL ORDER

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

picks.sort(
    (a, b) =>
        getCandidateTime(a).localeCompare(
            getCandidateTime(b),
            undefined,
            {
                numeric: true
            }
        )
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

async function loadRace(
    meetingId,
    raceIndex,
    raceTime
) {

    try {

        const container =
            document.getElementById(
                "analysis"
            );

        if (container) {

            container.innerHTML =
                `<div class="race-loading">
                    Loading race data...
                 </div>`;
        }

        const response =
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
                response.race.time
        };

        document.getElementById(
            "raceTitle"
        ).textContent =
            `${response.meeting.name} ${raceTime} - ${response.race.title}`;

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

        runners.sort(
            (a, b) =>
                b.elite.rating -
                a.elite.rating
        );

        const marginTier =
            raceMarginTier(
                runners
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
                label: "SAFE BET",
                className:
                    "selection-safe"
            };

        } else if (
            marginTier?.tier ===
            "Moderate"
        ) {

            selectionStatus = {
                label: "BET CAUTION",
                className:
                    "selection-caution"
            };

        } else if (
            marginTier?.tier ===
            "Open"
        ) {

            selectionStatus = {
                label: "VOID BET",
                className:
                    "selection-void"
            };
        }

        const tierLabel =
            selectionStatus
                ? `<span class="race-info-dot">•</span>` +
                  `<span class="race-info-item ${selectionStatus.className}" ` +
                  `title="Selection status based on the measured separation of the leading rating">` +
                  `${selectionStatus.label}` +
                  `${
                      marginTier.margin > 0
                          ? ` (+${marginTier.margin.toFixed(1)} clear)`
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
                marginTier?.tier === "Open"
            );
        }

        document.getElementById(
            "raceInfoBanner"
        ).innerHTML = `
            <span class="race-info-item">
                Class ${escapeHtml(
                    response.race.class ?? "-"
                )}
            </span>

            <span class="race-info-dot">•</span>

            <span class="race-info-item">
                ${escapeHtml(
                    response.race.distance ?? "-"
                )}
            </span>

            <span class="race-info-dot">•</span>

            <span class="race-info-item ${drawAdvClass}">
                Draw Advantage:
                ${escapeHtml(drawAdv)}
            </span>

            ${tierLabel}
        `;

        container.innerHTML = "";

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

        const runnerFragment =
            document.createDocumentFragment();

        runners.forEach(
            (runner, index) => {

                const medal =
                    index === 0
                        ? "🥇"
                        : index === 1
                            ? "🥈"
                            : index === 2
                                ? "🥉"
                                : "";

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "runner-card";

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
                        runner.elite.engineDetails
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
                                    ? "Hide working â–´"
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
                                    ? "Hide scoring â–´"
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

        response.races.forEach(
            (race, index) => {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "race-card";

                card.innerHTML = `

                    <span class="race-card-time">
                        ${escapeHtml(
                            toLocalTimeString(
                                race.time
                            )
                        )}
                    </span>

                    <span class="race-card-meta">
                        Class
                        ${escapeHtml(
                            race.class
                        )}
                        •
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
                    () => {

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

                        loadRace(
                            meetingId,
                            race.index,
                            toLocalTimeString(
                                race.time
                            )
                        );
                    }
                );

                if (index === 0) {

                    firstCard = {
                        card,
                        race
                    };
                }

                container.appendChild(
                    card
                );
            }
        );

        if (
            firstCard &&
            autoSelectFirst
        ) {

            firstCard.card.classList.add(
                "active"
            );

            loadRace(
                meetingId,
                firstCard.race.index,
                toLocalTimeString(
                    firstCard.race.time
                )
            );
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

        const nap =
            dashboard.nap &&
            dashboard.nap.active
                ? dashboard.nap
                : null;

        const best =
            dashboard.bestOpportunity;

        console.log(
            "EPR DASHBOARD DATE DEBUG:",
            JSON.stringify(
                {
                    date:
                        dashboard?.date,

                    meetingDate:
                        dashboard?.meetingDate,

                    meetings:
                        dashboard?.meetings?.map(
                            m => ({
                                name:
                                    m?.name,

                                date:
                                    m?.date
                            })
                        )
                },
                null,
                2
            )
        );

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

        // The hero "Best Opportunity" badge must ONLY ever show the
        // properly-guarded bestOpportunity (Strong tier, 10pt+
        // margin) - NAP has its own separate, dedicated napCallout
        // element below and must never substitute here, since its
        // selection logic isn't guarded the same way. A previous
        // version of this code fell back through nap/standout,
        // silently bypassing the guard whenever a NAP existed.
        const hero = best;

        const napEl =
            document.getElementById(
                "napCallout"
            );

        if (napEl) {
            napEl.style.display =
                "none";
        }

        if (!hero) {

            document.getElementById(
                "bestHorse"
            ).textContent =
                "No selections";

            document.getElementById(
                "bestRating"
            ).textContent =
                "EPR --";

            document.getElementById(
                "bestConfidence"
            ).textContent =
                "No qualified pick today";

            return;
        }

        if (hero) {

            document.getElementById(
                "bestHorse"
            ).textContent =
                hero.horse ?? "-";

            document.getElementById(
                "bestRating"
            ).textContent =
                hero.rating != null
                    ? `EPR ${hero.rating}`
                    : "-";

            const subEl =
                document.getElementById(
                    "bestConfidence"
                );

            // bestOpportunity is only ever set when Strong tier AND
            // a 10pt+ margin - both guaranteed whenever hero is
            // non-null, so this label is stated directly.
            const gapText =
                typeof hero.gap ===
                    "number" &&
                hero.gap > 0
                    ? ` • +${hero.gap.toFixed(1)} clear`
                    : "";

            subEl.textContent =
                `Strong pick${gapText}`;

            subEl.className =
                "tier-strong";

            document.getElementById(
                "bestCourse"
            ).textContent =
                hero.course ?? "-";

            document.getElementById(
                "bestRaceTime"
            ).textContent =
                hero.raceTime
                    ? toLocalTimeString(
                        hero.raceTime
                    )
                    : "-";

            const silk =
                document.getElementById(
                    "bestSilk"
                );

            if (hero.silkUrl) {

                silk.src =
                    hero.silkUrl;

                silk.style.display =
                    "";

            } else {

                silk.style.display =
                    "none";
            }

            const heroBadge =
                document.getElementById(
                    "heroBadge"
                );

            if (
                hero.meetingId != null &&
                hero.raceIndex != null
            ) {

                heroBadge.style.cursor =
                    "pointer";

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

                heroBadge.onclick =
                    async () => {

                        await goToHeroRace();

                        document
                            .getElementById(
                                "analysisSection"
                            )
                            .scrollIntoView({
                                behavior:
                                    "smooth",

                                block:
                                    "start"
                            });
                    };

                goToHeroRace();
            }

        } else {

            // No race today meets the Strong tier + 10pt margin bar -
            // a clean, honest empty state, rather than crashing on a
            // null hero or (as before this fix) silently substituting
            // an ungated NAP pick instead.
            document.getElementById(
                "bestHorse"
            ).textContent =
                "-";

            document.getElementById(
                "bestRating"
            ).textContent =
                "-";

            const subEl =
                document.getElementById(
                    "bestConfidence"
                );

            subEl.textContent =
                "No qualified opportunity today";

            subEl.className =
                "tier-open";

            document.getElementById(
                "bestCourse"
            ).textContent =
                "-";

            document.getElementById(
                "bestRaceTime"
            ).textContent =
                "-";

            const silk =
                document.getElementById(
                    "bestSilk"
                );

            silk.style.display =
                "none";

            const heroBadge =
                document.getElementById(
                    "heroBadge"
                );

            heroBadge.style.cursor =
                "default";

            heroBadge.onclick =
                null;

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
                            )
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

        // Live ticker deliberately remains disabled
        // until required by the dashboard layout.
        //
        // startLiveTicker(dashboard);

        await loadMeetings();

        loadTodaysResults();

        setInterval(
            loadTodaysResults,
            300000
        );

    } catch (err) {

        console.error(
            "Error loading dashboard:",
            err
        );
    }
}

async function loadTodaysResults() {

    try {

        const response =
            await fetch(
                "/api/checkResults"
            );

        const strip =
            document.getElementById(
                "todaysResultsStrip"
            );

        if (!strip) {
            return;
        }

        if (!response.ok) {

            strip.style.display =
                "none";

            return;
        }

        const data =
            await response.json();

        if (
            !data.success ||
            !data.racesChecked
        ) {

            strip.style.display =
                "none";

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

        strip.innerHTML = `

            <div class="results-strip-summary">

                <span class="results-strip-label">
                    Today's Results (Live)
                </span>

                <span class="results-strip-stat">
                    ${data.racesChecked}
                    races checked
                </span>

                <span class="results-strip-stat results-strip-win">
                    ${data.topPickWins}
                    won (${winRate}%)
                </span>

                <span class="results-strip-stat results-strip-place">
                    ${data.topPickPlaces}
                    placed (${placeRate}%)
                </span>

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
                                                (${escapeHtml(
                                                    d.outcome
                                                )})

                                                ${
                                                    d.outcome !==
                                                        "won" &&
                                                    d.actualWinner
                                                        ? `
                                                            &nbsp;â†’&nbsp;
                                                            Winner:
                                                            ${escapeHtml(
                                                                d.actualWinner
                                                            )}
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

        strip.style.display =
            "";

    } catch (err) {

        console.error(
            "Error loading today's results:",
            err
        );
    }
}

async function loadMeetings() {

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
                        ${escapeHtml(
                            meeting.raceCount
                        )}
                    </span>

                `;

                card.addEventListener(
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

    } catch (err) {

        console.error(
            "Error loading meetings:",
            err
        );
    }
}







