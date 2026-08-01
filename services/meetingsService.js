const json = require("./jsonService");

function getMeetings() {

    const cards = json.load("stage2_cards.json");

    return Object.entries(cards).map(([id, meeting]) => ({

        id,
        name: meeting.name,
        date: meeting.date,
        going: meeting.going,
        raceCount: meeting.races.length

    }));

}

module.exports = {

    getMeetings

};
