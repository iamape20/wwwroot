const json = require("./jsonService");

function getRaces(meetingId) {

    const cards = json.load("stage2_cards.json");

    const meeting = cards[meetingId];

    if (!meeting) {
        throw new Error("Meeting not found.");
    }

    return {

        meeting: {

            id: meetingId,
            name: meeting.name,
            date: meeting.date,
            going: meeting.going

        },

        races: meeting.races.map((race, index) => ({

            index,
            title: race.display_title || "Race",
            time: race.time,
            distance: race.distance,
            class: race.race_class,
            runners: race.runners.length,
            verdict: race.verdict,
            bettingForecast: race.betting_forecast

        }))

    };

}

module.exports = {

    getRaces

};