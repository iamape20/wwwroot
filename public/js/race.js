const params = new URLSearchParams(window.location.search);

const course = params.get("course");
const time = params.get("time");

fetch(`/api/race/${encodeURIComponent(course)}/${encodeURIComponent(time)}`)
    .then(r => r.json())
    .then(race => {

        document.getElementById("raceTitle").textContent =
            `${course} ${time}`;

        race.runners.sort((a, b) => b.rating - a.rating);

        const content = document.getElementById("raceContent");

        race.runners.forEach(horse => {

            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <h3>${horse.horse}</h3>
                <p><strong>Rating:</strong> ${horse.rating.toFixed(2)}</p>
                <p><strong>Confidence:</strong> ${horse.confidence}%</p>
            `;

            content.appendChild(card);

        });

    });