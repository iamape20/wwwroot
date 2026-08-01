async function loadMeetings() {

    const data = await getMeetings();

    const container = document.getElementById("meetings");

    container.innerHTML = "";

    data.meetings.forEach(meeting => {

        const card = document.createElement("div");

        card.className = "meeting-card";

        card.innerHTML = `
            <h2>${meeting.name}</h2>

            <p><strong>Date:</strong> ${meeting.date}</p>

            <p><strong>Going:</strong> ${meeting.going}</p>

            <p><strong>Races:</strong> ${meeting.raceCount}</p>
        `;

        container.appendChild(card);

    });

}