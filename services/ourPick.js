'use strict';
// ourPick.js (2026-11-04) - the one rule for "our pick" in a race
//
// The first declared runner in stored order (the market-override pick: the
// shortest price, rating breaks ties). 4-5 Nov 2026 only: the race's value pick
// (race.value_pick) when it was a declared runner; otherwise the first declared runner in stored order (the
// market-override pick, as before). Mirror of js/ourPick.js in the pipeline repo -
// keep the two the same.

const up = s => String(s || "").toUpperCase();

function ourPick(race) {
    const declared = (race?.runners || []).filter(r => r && r.non_runner !== true);
    // From 2026-11-06 (user chose "Our pick = the likeliest winner") a value pick
    // carries ourPick: false and no longer replaces the pick; days before keep the
    // value pick they published.
    const vName = race?.value_pick?.ourPick === false ? null : race?.value_pick?.name;
    return (vName && declared.find(r => up(r.name) === up(vName))) || declared[0] || null;
}

module.exports = { ourPick };
