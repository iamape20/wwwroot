const json = require("../services/jsonService");

// Card at a glance (2026-10-11): one row per race today with our pick, the
// market favourite (shortest current bookmaker price) and whether they agree.
// Reads json/final_ratings.json only; runners[0] among non-runners-excluded is
// our pick, the same rule the results tracker and the race page use.

function decimal(v) {
    const s = String(v ?? "").trim().toLowerCase();
    if (s === "evs" || s === "evens") return 2;
    const m = s.match(/^(\d+)\/(\d+)$/);
    return m && Number(m[2]) > 0 ? 1 + Number(m[1]) / Number(m[2]) : null;
}

// ---------------------------------------------------------------------------
// ?view=guide : form guide for today's featured picks (NAP, daily double, strong,
// moderate). Plain-language reasons and risks built from the same fields the
// race page shows. Reads json only; reports, does not recommend a stake.
// ---------------------------------------------------------------------------
function safeLoad(name) { try { return json.load(name); } catch { return null; } }

const LABELS = {
    recentForm: "Last run", jockey: "Jockey", trainer: "Stable form", marketMove: "Market", classChange: "Class",
    tripChange: "Trip", speed: "Speed", draw: "Draw", fitness: "Fitness", jockeyForm: "Jockey form",
    classDropRatingEdge: "Class drop", firstTimeAids: "Headgear", runningStyle: "Running style", class: "Class"
};

function guideEntry(ratings, meetingName, time, horse, label, tier, tierReason) {
    const meeting = Object.values(ratings || {}).find(m => m.name === meetingName);
    const race = meeting && (meeting.races || []).find(r => r.time === time);
    if (!race) return null;
    const active = (race.runners || []).filter(r => r && r.non_runner !== true);
    const u = active.find(r => String(r.name).toUpperCase() === String(horse).toUpperCase());
    if (!u) return null;
    const second = active.filter(x => x !== u)[0] || null;
    const f = u.form || {};
    const reasons = [], risks = [];

    for (const [k, v] of Object.entries(u.checklist_breakdown || {})) {
        if (!v || !(v.max > 0)) continue;
        const pts = Number(v.points) || 0;
        if (pts >= v.max * 0.6 && v.evidence) reasons.push((LABELS[k] ? LABELS[k] + ": " : "") + String(v.evidence).replace(/\s+/g, " "));
        else if (pts === 0 && v.evidence && k === "jockeyForm") risks.push("Jockey form: " + String(v.evidence));
    }
    if (second && Number.isFinite(u.power_rating) && Number.isFinite(second.power_rating)) {
        reasons.unshift("Rated " + (u.power_rating - second.power_rating).toFixed(1) + " points above the next best (" + second.name + ", " + second.power_rating + ").");
    }
    if (active.length <= 5) risks.push("Small field of " + active.length + " - fewer rivals, but the order is easier to upset.");
    if (u.days_since_run > 120) risks.push("Last ran " + u.days_since_run + " days ago.");
    if (u.is_unexposed) risks.push("Little or no form on record, so the rating leans on the market and the trainer.");
    const mine = active.map(r => decimal(r.current_odds)).filter(Boolean).sort((a, b) => a - b);
    if (mine.length > 1 && mine[1] / mine[0] < 1.15) risks.push("The market is bunched at the top - the favourite is barely shorter than the second choice.");
    const d = decimal(u.current_odds);
    if (d && d < 1.6) risks.push("Short price (" + u.current_odds + ") - little room for error.");

    return {
        label, tier: tier || null, tierReason: tierReason || null,
        course: meetingName, time, horse: u.name, odds: u.current_odds || null,
        rating: u.power_rating, fieldSize: active.length,
        raceTitle: race.display_title || null, distance: race.distance || null, going: meeting.going || null,
        trainer: u.trainer, jockey: u.jockey, form: u.formsummary || f.raw || null, positions: f.positions || [],
        daysSinceRun: u.days_since_run, checklist: u.checklist_points || null,
        breakdown: u.rating_breakdown ? Object.entries(u.rating_breakdown).map(([k, v]) => ({ part: k, score: v.score, weight: v.weight })) : [],
        reasons: reasons.slice(0, 5), risks: risks.slice(0, 4)
    };
}

function guide(res) {
    const ratings = safeLoad("final_ratings.json");
    const nap = safeLoad("nap_spotlight.json");
    const sl = safeLoad("shortlist.json") || {};
    const out = [];
    const seen = new Set();
    const add = (label, p) => {
        if (!p) return;
        const m = p.meeting || p.course || p.meetingName, t = p.time, h = p.name || p.horse;
        const key = m + t + h;
        if (seen.has(key)) return;
        const e = guideEntry(ratings, m, t, h, label, p.tier, p.tierReason);
        if (e) { seen.add(key); out.push(e); }
    };
    if (nap && nap.active) add("Today's NAP", nap);
    (sl.dailyDouble || []).forEach(p => add("Daily double", p));
    (sl.strong || []).forEach(p => add("Strong", p));
    (sl.moderate || []).forEach(p => add("Moderate", p));
    res.json({ success: true, date: (ratings && Object.values(ratings)[0] || {}).date || null, picks: out });
}

module.exports = (req, res) => {

    res.setHeader("Cache-Control", "no-store");

    if (String(req.query?.view || "") === "guide") return guide(res);

    try {
        const ratings = json.load("final_ratings.json");
        const races = [];
        let date = null;

        for (const meeting of Object.values(ratings || {})) {
            date = date || meeting.date;
            for (const race of meeting.races || []) {
                const active = (race.runners || []).filter(r => r && r.non_runner !== true);
                if (!active.length) continue;
                const pick = active[0];

                let fav = null, favDec = Infinity, favCount = 0;
                for (const r of active) {
                    const d = decimal(r.current_odds);
                    if (d == null) continue;
                    if (d < favDec) { favDec = d; fav = r; favCount = 1; }
                    else if (d === favDec) favCount++;
                }

                races.push({
                    course: meeting.name,
                    time: race.time,
                    runners: active.length,
                    pick: pick.name,
                    pickOdds: pick.current_odds || null,
                    fav: fav ? fav.name : null,
                    favOdds: fav ? fav.current_odds : null,
                    jointFav: favCount > 1,
                    agree: !!fav && favCount === 1 && fav.name === pick.name
                });
            }
        }

        races.sort((a, b) => a.time.localeCompare(b.time) || a.course.localeCompare(b.course));
        res.json({ success: true, date, races });
    } catch {
        res.json({ success: true, date: null, races: [] });
    }

};
