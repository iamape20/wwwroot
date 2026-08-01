const params = new URLSearchParams(window.location.search);
const course = params.get("course");

document.getElementById("meetingTitle").textContent = course;

fetch(`/api/meeting/${encodeURIComponent(course)}`)
    .then(r => r.json())
    .then(races => {

        const list = document.getElementById("raceList");

        races.forEach(race => {

            const div = document.createElement("div");

            div.className = "card";

            div.innerHTML = `
                <h3>${race.raceTime}</h3>
                <p>${race.distance}</p>
                <p>Class ${race.raceClass}</p>
                <p>${race.runnerCount} runners</p>
            `;

			div.className = "card";

			div.onclick = () => {
				window.location.href =
					`/race.html?course=${encodeURIComponent(course)}&time=${encodeURIComponent(race.raceTime)}`;
			};

            list.appendChild(div);

        });

    });