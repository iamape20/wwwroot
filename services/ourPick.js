'use strict';
// ourPick.js (2026-11-04) - the one rule for "our pick" in a race
//
// The race's value pick (race.value_pick, js/markValuePicks.js) when it is a
// declared runner; otherwise the first declared runner in stored order (the
// market-override pick, as before). Mirror of js/ourPick.js in the pipeline repo -
// keep the two the same.

const up = s => String(s || "").toUpperCase();

function ourPick(race) {
    const declared = (race?.runners || []).filter(r => r && r.non_runner !== true);
    const vName = race?.value_pick?.name;
    return (vName && declared.find(r => up(r.name) === up(vName))) || declared[0] || null;
}

module.exports = { ourPick };
