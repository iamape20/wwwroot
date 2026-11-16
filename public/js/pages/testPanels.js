// testPanels.js (2026-11-06) - the three paper-test panels, moved off the home
// page to tests.html (user 2026-11-06 "Index.html is too populated"). Each reads
// its part of data/record.json (js/buildStaticSite.js buildRecord).

function escapeHtml(str) {
    if (typeof str !== "string") return str ?? "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
        : p.outcome === "won" ? `<span class="record-plus">won</span> SP ${+Number(p.bsp).toFixed(2)}`
        : p.outcome === "lost" ? `<span class="record-minus">lost</span> SP ${+Number(p.bsp).toFixed(2)}`
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

// Extra places paper test progress (user 2026-11-06 "show the extra places test
// progress too"): js/extraPlacesPaperTest.js, £1 each way on our top-rated where a
// bookmaker pays more places than standard; passes in profit after passAt bets
// and in both halves, at the price taken (no Best Odds Guaranteed).
function renderExtraPlaces(ep) {
    const el = document.getElementById("extraPlacesBlock");
    if (!el) return;
    if (!ep) { el.style.display = "none"; return; }
    const pts = v => `<span class="${v < 0 ? "record-minus" : "record-plus"}">${v < 0 ? "-" : "+"}${Math.abs(v).toFixed(2)} pts</span>`;
    const pc = v => v == null ? "-" : `${v > 0 ? "+" : ""}${v}%`;
    const day = iso => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
    const ord = p => p + (p % 100 >= 11 && p % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[p % 10] || "th"));
    const odds = d => { if (Math.abs(d - 2) < 0.01) return "evens"; for (const den of [1, 2, 3, 4, 5, 6, 8, 10, 11, 13, 15, 20, 40]) { const num = (d - 1) * den; if (Math.abs(num - Math.round(num)) < 0.02) return `${Math.round(num)}/${den}`; } return String(d); };
    const fr = f => ({ 0.25: "1/4", 0.2: "1/5", 0.1667: "1/6", 0.3333: "1/3", 0.5: "1/2" }[f] || f);
    const res = b => b.outcome === "won" ? `<span class="record-plus">won</span> ${pts(b.pl)}`
        : b.outcome === "placed" ? `<span class="record-plus">${ord(b.pos)}</span>${b.pos > b.stdPlaces ? " (the extra place)" : ""} ${pts(b.pl)}`
        : b.outcome === "lost" ? `<span class="record-minus">${b.pos && b.pos < 99 ? ord(b.pos) : "unplaced"}</span> ${pts(b.pl)}`
        : b.outcome === "void" ? `<span class="record-since">void</span>` : `<span class="record-since">to run</span>`;
    const bet = b => `<div class="record-row"><b>${escapeHtml(b.horse)}</b> <span class="record-since">${escapeHtml(b.course)} ${escapeHtml(b.time)} &middot; ${odds(b.price)} with ${escapeHtml(String(b.book).replace(/ v\d+$/, ""))}, ${b.places} places at ${fr(b.frac)} (usually ${b.stdPlaces})</span> ${res(b)}</div>`;
    const pct = Math.min(100, Math.round(100 * ep.bets / (ep.passAt || 300)));
    const halves = ep.bets >= 2 ? ep.halves.map((h, i) => `<span class="${h > 0 ? "record-plus" : "record-minus"}">${i ? "2nd" : "1st"} half ${pc(h)}</span>`).join(" ") : "";
    const verdict = ep.verdict ? `<span class="rule-test-verdict rule-test-${ep.verdict.toLowerCase()}">${ep.verdict}</span>` : "";
    const recent = ep.recent || [];
    const todayRow = recent.find(d => d.date === today);
    const todayHtml = todayRow ? (todayRow.bets.length ? todayRow.bets.map(bet).join("") : `<div class="record-row record-since">No extra places on today's card.</div>`)
        : `<div class="record-row record-since">Today's bets lock at 9am.</div>`;
    const past = recent.filter(d => d.date !== today);
    const pastHtml = past.length ? `<div class="rule-test-sub">Recent days</div><table class="rule-test-table"><tbody>${past.map(d => {
        const done = d.bets.filter(b => b.pl != null);
        const tot = done.reduce((s, b) => s + b.pl, 0);
        return `<tr><td class="record-since">${day(d.date)}</td><td>${d.bets.length} bets &middot; ${done.filter(b => b.outcome === "won").length} won, ${done.filter(b => b.outcome === "placed").length} placed${done.length ? ` &middot; ${pts(tot)}` : ""}</td></tr>`;
    }).join("")}</tbody></table>` : "";
    el.innerHTML = `<div class="results-strip-label">Extra places test</div>
        <div class="record-since">Our top-rated horse each way, £1 each way, at the 9am price, in races where Betfair Sportsbook, Paddy Power or Sky Bet pays more places than usual at the same fraction of the odds. No money. To pass it must be in profit after ${ep.passAt} bets and in both halves, without counting Best Odds Guaranteed.</div>
        <div class="rule-test-rules"><div class="rule-test-rule">
            <div class="rule-test-head"><b>Top-rated each way</b>${verdict}</div>
            <div class="rule-test-bar"><span style="width:${pct}%"></span></div>
            <div class="record-since">${ep.bets} of ${ep.passAt} bets settled</div>
            <div class="record-row">${ep.bets ? `${ep.won} won, ${ep.placed} placed &middot; ${pts(ep.pl)} &middot; ${pc(ep.roiPct)} a £ staked` : "No bets settled yet"}</div>
            ${ep.bets ? `<div class="record-row record-since">On usual terms it would be ${pc(ep.standardRoiPct)}; ${ep.extraPlaceHits} paid only thanks to the extra place. With Best Odds Guaranteed ${pc(ep.bogRoiPct)}</div>` : ""}
            ${halves ? `<div class="record-row">${halves}</div>` : ""}
        </div><div class="rule-test-rule">
            <div class="rule-test-head"><b>For comparison</b></div>
            <div class="record-row">Every runner on an extra place: ${ep.everyRunner?.bets ? `${pc(ep.everyRunner.roiPct)} (usual terms ${pc(ep.everyRunner.standardRoiPct)}), ${ep.everyRunner.bets} bets` : "none settled yet"}</div>
            <div class="record-row">More places but a smaller fraction: ${ep.trade?.bets ? `${pc(ep.trade.roiPct)} (usual terms ${pc(ep.trade.standardRoiPct)}), ${ep.trade.bets} bets` : "none settled yet"}</div>
        </div></div>
        <div class="rule-test-sub">Today</div>${todayHtml}${pastHtml}`;
    el.style.display = "";
}

// Best Odds Guaranteed paper test progress (user 2026-11-06 "show the BOG test
// progress too"): js/bogPaperTest.js, £1 on our top-rated at evens to 4/1 in every
// race at 9am, paid the bigger of that price and the SP; passes in profit after
// passAt bets and in both halves.
function renderBogTest(bg) {
    const el = document.getElementById("bogBlock");
    if (!el) return;
    if (!bg) { el.style.display = "none"; return; }
    const pts = v => `<span class="${v < 0 ? "record-minus" : "record-plus"}">${v < 0 ? "-" : "+"}${Math.abs(v).toFixed(2)} pts</span>`;
    const pc = v => v == null ? "-" : `${v > 0 ? "+" : ""}${v}%`;
    const day = iso => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
    const spFrac = d => { if (!d) return ""; if (Math.abs(d - 2) < 0.01) return "evens"; for (const den of [1, 2, 3, 4, 5, 6, 8, 10, 11, 13, 15, 20, 40]) { const n = (d - 1) * den; if (Math.abs(n - Math.round(n)) < 0.02) return `${Math.round(n)}/${den}`; } return d.toFixed(2); };
    const res = b => b.outcome === "won" ? `<span class="record-plus">won</span> SP ${spFrac(b.sp)} ${pts(b.pl)}${b.pl > b.plNoBog ? ` <span class="record-since">(BOG paid the SP)</span>` : ""}`
        : b.outcome === "lost" ? `<span class="record-minus">lost</span>`
        : b.outcome === "void" ? `<span class="record-since">void</span>` : `<span class="record-since">to run</span>`;
    const pct = Math.min(100, Math.round(100 * bg.bets / (bg.passAt || 600)));
    const halves = bg.bets >= 2 ? bg.halves.map((h, i) => `<span class="${h > 0 ? "record-plus" : "record-minus"}">${i ? "2nd" : "1st"} half ${pc(h)}</span>`).join(" ") : "";
    const verdict = bg.verdict ? `<span class="rule-test-verdict rule-test-${bg.verdict.toLowerCase()}">${bg.verdict}</span>` : "";
    const recent = bg.recent || [];
    const todayRow = recent.find(d => d.date === today);
    let todayHtml = `<div class="record-row record-since">Today's bets lock at 9am.</div>`;
    if (todayRow) {
        const done = todayRow.bets.filter(b => b.pl != null);
        const head = `${todayRow.bets.length} bets &middot; ${done.filter(b => b.outcome === "won").length} won of ${done.length} run${done.length ? ` &middot; ${pts(done.reduce((s, b) => s + b.pl, 0))}` : ""}`;
        todayHtml = todayRow.bets.length ? `<details class="bog-today"><summary>${head}</summary><table class="rule-test-table"><tbody>${
            [...todayRow.bets].sort((a, b) => a.time.localeCompare(b.time)).map(b => `<tr><td class="record-since">${escapeHtml(b.time)}</td><td><b>${escapeHtml(b.horse)}</b> <span class="record-since">${escapeHtml(b.course)} &middot; ${escapeHtml(b.odds)}</span> ${res(b)}</td></tr>`).join("")
        }</tbody></table></details>` : `<div class="record-row record-since">No bets today: no top-rated horse at evens to 4/1.</div>`;
    }
    const past = recent.filter(d => d.date !== today);
    const pastHtml = past.length ? `<div class="rule-test-sub">Recent days</div><table class="rule-test-table"><tbody>${past.map(d => {
        const done = d.bets.filter(b => b.pl != null);
        const bogWins = done.filter(b => b.outcome === "won" && b.pl > b.plNoBog).length;
        return `<tr><td class="record-since">${day(d.date)}</td><td>${d.bets.length} bets &middot; ${done.filter(b => b.outcome === "won").length} won${done.length ? ` &middot; ${pts(done.reduce((s, b) => s + b.pl, 0))}` : ""}${bogWins ? ` <span class="record-since">&middot; BOG paid more on ${bogWins}</span>` : ""}</td></tr>`;
    }).join("")}</tbody></table>` : "";
    el.innerHTML = `<div class="results-strip-label">Best Odds Guaranteed test</div>
        <div class="record-since">£1 on our top-rated horse in every race, when its 9am price is evens to 4/1, paid the bigger of the 9am price and the starting price if it wins (Best Odds Guaranteed). No money. To pass it must be in profit after ${bg.passAt} bets and in both halves. There is no valid past test, so this is the first real one.</div>
        <div class="rule-test-rules"><div class="rule-test-rule">
            <div class="rule-test-head"><b>Top-rated, evens to 4/1</b>${verdict}</div>
            <div class="rule-test-bar"><span style="width:${pct}%"></span></div>
            <div class="record-since">${bg.bets} of ${bg.passAt} bets settled</div>
            <div class="record-row">${bg.bets ? `${bg.won} won (${Math.round(100 * bg.won / bg.bets)}%) &middot; ${pts(bg.pl)} &middot; ${pc(bg.roiPct)} a bet` : "No bets settled yet"}</div>
            ${halves ? `<div class="record-row">${halves}</div>` : ""}
        </div><div class="rule-test-rule">
            <div class="rule-test-head"><b>What BOG is worth</b></div>
            <div class="record-row">Without BOG (9am price only): ${bg.bets ? pc(bg.noBogRoiPct) : "-"}</div>
            <div class="record-row">Same horses at Betfair SP after 2%: ${bg.exchangeBets ? `${pc(bg.exchangeRoiPct)} (${bg.exchangeBets} bets)` : "-"}</div>
            <div class="record-row record-since">${bg.bets ? `BOG paid more than the 9am price on ${bg.bogPaidMore} of ${bg.won} winners` : "Filled in as bets settle"}</div>
        </div></div>
        <div class="rule-test-sub">Today</div>${todayHtml}${pastHtml}`;
    el.style.display = "";
}

// Favourite 2/1-4/1 paper test (user 2026-11-11 "start it"): js/favPaperTest.js,
// £1 on Our pick when it is the favourite at 2/1 to 4/1 in the last 15 minutes,
// settled at Betfair SP after 2%; passes in profit after passAt bets and both halves.
// The same panel shows the dropped-in-trip test (tripPaperTest.js, 2026-11-12).
const FAV_TEXT = {
    id: "favBlock", label: "Favourite 2/1 to 4/1 test", head: "Our pick, favourite at 2/1 to 4/1",
    what: "£1 on our pick when it is the favourite at 2/1 to 4/1 in the last 15 minutes before the off",
    none: "No bets yet. A race is recorded in its last 15 minutes when our pick is the favourite at 2/1 to 4/1.",
};
const TRIP_TEXT = {
    id: "tripBlock", label: "Dropped in trip test", head: "Dropping back in trip, 10/1 or shorter",
    what: "£1 on any horse whose Timeform comment says it is dropping back in trip, at 10/1 or shorter in the last 15 minutes before the off",
    none: "No bets yet. A horse is recorded in its race's last 15 minutes when its comment says it drops back in trip and it is 10/1 or shorter.",
};
// Up-in-trip paper test (tripUpPaperTest.js, 2026-11-16), same panel shape.
const TRIP_UP_TEXT = {
    id: "tripUpBlock", label: "Up in trip test", head: "Running 1 furlong or more further than last time, 10/1 or shorter",
    what: "£1 on any horse running at least 1 furlong further than its last race, at 10/1 or shorter in the last 15 minutes before the off",
    none: "No bets yet. A horse is recorded in its race's last 15 minutes when today's trip is 1 furlong or more longer than its last run and it is 10/1 or shorter.",
};
// Similar-course paper test (similarCoursePaperTest.js, 2026-11-16), same panel shape.
const SIMILAR_TEXT = {
    id: "similarBlock", label: "Similar course test", head: "First time at the course, already won at a similar one, 10/1 or shorter",
    what: "£1 on any horse running at a course for the first time that has already won at a similar course (same direction, same kind of finish, equally tight or galloping), at 10/1 or shorter in the last 15 minutes before the off",
    none: "No bets yet. A horse is recorded in its race's last 15 minutes when it has never run at the course, has won at a similar course and is 10/1 or shorter.",
};
// Raised-winner paper test (raisedWinnerPaperTest.js, 2026-11-16), same panel shape.
const RAISED_TEXT = {
    id: "raisedBlock", label: "Raised after winning test", head: "Handicapper raised 5lb or more after winning, 10/1 or shorter",
    what: "£1 on any handicapper that won last time and has been raised 5lb or more since, on its first run off the new mark, at 10/1 or shorter in the last 15 minutes before the off",
    none: "No bets yet. A horse is recorded in its race's last 15 minutes when it won last time, is now rated 5lb or more higher and is 10/1 or shorter.",
};
// New-trainer paper test (newTrainerPaperTest.js, 2026-11-16), same panel shape.
const NEW_TRAINER_TEXT = {
    id: "newTrainerBlock", label: "New trainer test", head: "First run for a new trainer, 10/1 or shorter",
    what: "£1 on any horse having its first run for a new trainer, at 10/1 or shorter in the last 15 minutes before the off",
    none: "No bets yet. A horse is recorded in its race's last 15 minutes when its trainer is different from its last run and it is 10/1 or shorter.",
};
// Rating + checklist blend paper test (blendPaperTest.js, 2026-11-16), same panel shape.
const BLEND_TEXT = {
    id: "blendBlock", label: "Rating + checklist test", head: "Our rating blended with the Do Your Own Ratings checklist",
    what: "£1 in every race on the horse with the best mix of our rating and your Do Your Own Ratings checklist (half weight), at any price, in the last 15 minutes before the off",
    none: "No bets yet. One horse is recorded in each race's last 15 minutes.",
};
function renderFavTest(ft, t = FAV_TEXT) {
    const el = document.getElementById(t.id);
    if (!el) return;
    if (!ft) { el.style.display = "none"; return; }
    const pts = v => `<span class="${v < 0 ? "record-minus" : "record-plus"}">${v < 0 ? "-" : "+"}${Math.abs(v).toFixed(2)} pts</span>`;
    const pc = v => v == null ? "-" : `${v > 0 ? "+" : ""}${v}%`;
    const day = iso => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const uk = (d, t) => new Date(`${d}T${t}:00Z`).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
    const res = b => b.outcome === "won" ? `<span class="record-plus">won</span> SP ${+Number(b.bsp).toFixed(2)} ${pts(b.pl)}`
        : b.outcome === "lost" ? `<span class="record-minus">lost</span>` : b.outcome === "void" ? `<span class="record-since">void</span>` : `<span class="record-since">result to come</span>`;
    const pct = Math.min(100, Math.round(100 * ft.bets / (ft.passAt || 300)));
    const halves = ft.bets >= 2 ? ft.halves.map((h, i) => `<span class="${h > 0 ? "record-plus" : "record-minus"}">${i ? "2nd" : "1st"} half ${pc(h)}</span>`).join(" ") : "";
    const verdict = ft.verdict ? `<span class="rule-test-verdict rule-test-${ft.verdict.toLowerCase()}">${ft.verdict}</span>` : "";
    const recent = [...(ft.recent || [])].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const rows = recent.length ? `<div class="rule-test-sub">Last 7 days</div><table class="rule-test-table"><tbody>${recent.map(b =>
        `<tr><td class="record-since">${day(b.date)} ${uk(b.date, b.time)}</td><td><b>${escapeHtml(b.horse)}</b> <span class="record-since">${escapeHtml(b.course)} &middot; ${escapeHtml(b.odds)}</span> ${res(b)}</td></tr>`).join("")}</tbody></table>`
        : `<div class="record-row record-since">${t.none}</div>`;
    el.innerHTML = `<div class="results-strip-label">${t.label}</div>
        <div class="record-since">${t.what}, settled at Betfair starting price after 2%. No money. On ${ft.backtest.races} past races this won ${ft.backtest.wonPct}% when the price said ${ft.backtest.expectedPct}% (${pc(ft.backtest.roiPct)}), but that may be luck. To pass it must be in profit after ${ft.passAt} bets and in both halves.</div>
        <div class="rule-test-rules"><div class="rule-test-rule">
            <div class="rule-test-head"><b>${t.head}</b>${verdict}</div>
            <div class="rule-test-bar"><span style="width:${pct}%"></span></div>
            <div class="record-since">${ft.bets} of ${ft.passAt} bets settled${ft.pending ? ` &middot; ${ft.pending} waiting for the starting price` : ""}</div>
            <div class="record-row">${ft.bets ? `${ft.won} won (${ft.wonPct}%, price said ${ft.expectedPct}%) &middot; ${pts(ft.pl)} &middot; ${pc(ft.roiPct)} a bet` : "No bets settled yet"}</div>
            ${halves ? `<div class="record-row">${halves}</div>` : ""}
        </div></div>${rows}`;
    el.style.display = "";
}

// Lay won-last-2 paper test (user 2026-11-16): js/layPaperTest.js, a £1 lay at
// Betfair SP (limit 8.0) of any runner that won its last two runs, 7/1 or shorter
// in the last 15 minutes. outcome is the lay's result; returns are on money at risk.
function renderLayTest(lt) {
    const el = document.getElementById("layBlock");
    if (!el) return;
    if (!lt) { el.style.display = "none"; return; }
    const pts = v => `<span class="${v < 0 ? "record-minus" : "record-plus"}">${v < 0 ? "-" : "+"}${Math.abs(v).toFixed(2)} pts</span>`;
    const pc = v => v == null ? "-" : `${v > 0 ? "+" : ""}${v}%`;
    const day = iso => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const uk = (d, t) => new Date(`${d}T${t}:00Z`).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
    const res = b => b.outcome === "won" ? `beaten, <span class="record-plus">lay won</span> ${pts(b.pl)}`
        : b.outcome === "lost" ? `won, <span class="record-minus">lay lost</span> SP ${+Number(b.bsp).toFixed(2)} ${pts(b.pl)}`
        : b.outcome === "void" ? `<span class="record-since">void</span>` : `<span class="record-since">result to come</span>`;
    const pct = Math.min(100, Math.round(100 * lt.bets / (lt.passAt || 300)));
    const halves = lt.bets >= 2 ? lt.halves.map((h, i) => `<span class="${h > 0 ? "record-plus" : "record-minus"}">${i ? "2nd" : "1st"} half ${pc(h)}</span>`).join(" ") : "";
    const verdict = lt.verdict ? `<span class="rule-test-verdict rule-test-${lt.verdict.toLowerCase()}">${lt.verdict}</span>` : "";
    const recent = [...(lt.recent || [])].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const bt = lt.backtest;
    const rows = recent.length ? `<div class="rule-test-sub">Last 7 days</div><table class="rule-test-table"><tbody>${recent.map(b =>
        `<tr><td class="record-since">${day(b.date)} ${uk(b.date, b.time)}</td><td><b>${escapeHtml(b.horse)}</b> <span class="record-since">${escapeHtml(b.course)} &middot; ${escapeHtml(b.odds)}</span> ${res(b)}</td></tr>`).join("")}</tbody></table>`
        : `<div class="record-row record-since">No lays yet. A horse is recorded in its race's last 15 minutes when it won its last two runs and is 7/1 or shorter.</div>`;
    el.innerHTML = `<div class="results-strip-label">Lay test: won last two</div>
        <div class="record-since">A £1 lay (betting it will NOT win) of any horse that won its last two runs, at 7/1 or shorter in the last 15 minutes, settled at Betfair starting price after 2% (no lay above 8.0). No money. Returns are on the money at risk. On past races it made ${pc(bt.returnPct)} (${bt.lays} lays) and ${pc(bt.holdout.returnPct)} on months it was never tested on (${bt.holdout.lays} lays), too close to zero to call an edge. To pass it must be in profit after ${lt.passAt} lays and in both halves.</div>
        <div class="rule-test-rules"><div class="rule-test-rule">
            <div class="rule-test-head"><b>Lay horses that won their last two</b>${verdict}</div>
            <div class="rule-test-bar"><span style="width:${pct}%"></span></div>
            <div class="record-since">${lt.bets} of ${lt.passAt} lays settled${lt.pending ? ` &middot; ${lt.pending} waiting for the starting price` : ""}</div>
            <div class="record-row">${lt.bets ? `${lt.won} lays won (${lt.wonPct}%, price said ${lt.expectedPct}%) &middot; ${pts(lt.pl)} on ${lt.liability.toFixed(2)} at risk &middot; ${pc(lt.returnPct)}` : "No lays settled yet"}</div>
            ${halves ? `<div class="record-row">${halves}</div>` : ""}
        </div></div>${rows}`;
    el.style.display = "";
}

export async function loadTests() {
    try {
        const r = await fetch(`data/record.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) throw new Error(r.status);
        const d = await r.json();
        renderRuleTest(d.ruleTest, d.realBetsPaused);
        renderExtraPlaces(d.extraPlacesTest);
        renderBogTest(d.bogTest);
        renderFavTest(d.favTest);
        renderFavTest(d.tripTest, TRIP_TEXT);
        renderLayTest(d.layTest);
        renderFavTest(d.tripUpTest, TRIP_UP_TEXT);
        renderFavTest(d.similarTest, SIMILAR_TEXT);
        renderFavTest(d.raisedTest, RAISED_TEXT);
        renderFavTest(d.newTrainerTest, NEW_TRAINER_TEXT);
        renderFavTest(d.blendTest, BLEND_TEXT);
        const el = document.getElementById("testsUpdated");
        if (el && d.builtAt) el.textContent = `Updated ${new Date(d.builtAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
    } catch { /* keep what is shown */ }
}
