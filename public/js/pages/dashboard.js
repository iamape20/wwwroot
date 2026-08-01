import {
    getDashboard,
    getMeetings,
    getRaces,
    getRace
} from "../services/api.js";

async function loadRace(meetingId, raceIndex, raceTime) {

    try {

        const response = await getRace(meetingId, raceIndex);

        if (!response.success)
            return;

        document.getElementById("raceTitle").textContent =
            `${response.meeting.name} ${raceTime} - Elite Power Ratings`;

        const container = document.getElementById("analysis");

        container.innerHTML = "";

        const runners = [...response.race.runners];

        runners.sort((a, b) => b.elite.rating - a.elite.rating);

        runners.forEach((runner, index) => {

            const medal =
                index === 0 ? "🥇" :
                index === 1 ? "🥈" :
                index === 2 ? "🥉" : "";

            const card = document.createElement("div");

            card.className = "runner-card";

			const rating = runner.elite.rating;

			let ratingClass = "rating-blue";
			if (rating >= 55) ratingClass = "rating-gold";
			else if (rating >= 40) ratingClass = "rating-green";
			else if (rating < 25) ratingClass = "rating-grey";

			const confidence = Math.min(runner.elite.confidence, 100);

			card.innerHTML = `

			<div class="runner-row">

				<div class="runner-left">

					<div class="runner-medal">
						${medal}
					</div>

					<img
						class="runner-silk"
						src="${runner.silk_url}"
						alt="${runner.name}"
						onerror="this.style.display='none';"
					/>

					<div class="runner-details">

						<div class="runner-name">
							${runner.name}
						</div>

						<div class="runner-meta">

							${runner.trainer}

							&nbsp;•&nbsp;

							Form ${runner.formsummary}

							&nbsp;•&nbsp;

							Draw ${runner.draw}

							&nbsp;•&nbsp;

							Wt ${runner.weight}

						</div>

						<div class="confidence-bar">

							<div
								class="confidence-fill"
								style="width:${confidence}%">
							</div>

						</div>

						<div class="confidence-text">

							Confidence ${confidence.toFixed(1)}%

						</div>

					</div>

				</div>

				<div class="runner-right">

					<div class="rating-label">
						ELITE
					</div>

					<div class="rating ${ratingClass}">
						${rating.toFixed(2)}
					</div>

				</div>

			</div>

			`;
			
			
			
            container.appendChild(card);

        });

    }
    catch (err) {

        console.error(err);

    }

}

async function loadRaces(meetingId, meetingName) {

    try {

        document.getElementById("meetingTitle").textContent =
            `${meetingName} Races`;

        const response = await getRaces(meetingId);

        if (!response.success)
            return;

        const container = document.getElementById("races");

        container.innerHTML = "";

		response.races.forEach(race => {

			const card = document.createElement("div");

			card.className = "race-card";

			card.innerHTML = `
				<h3>${race.time}</h3>
				<p>Class ${race.class} • ${race.distance}</p>
				<small>${race.runners} runners</small>
			`;

			card.addEventListener("click", () => {

				loadRace(meetingId, race.index, race.time);

			});

			container.appendChild(card);

		});

    }
    catch (err) {

        console.error(err);

    }

}

export async function loadDashboard() {

    try {

        const response = await getDashboard();

        console.log(response);

        if (!response.success) {
            throw new Error("Dashboard request failed.");
        }

		const dashboard = response.dashboard;
		const best = dashboard.bestOpportunity;

		if (!best) {

			document.getElementById("bestHorse").textContent = "No selections";
			document.getElementById("bestRating").textContent = "--";
			document.getElementById("bestConfidence").textContent = "--%";

			return;
		}

        document.getElementById("bestHorse").textContent = best.horse ?? "-";
        document.getElementById("bestRating").textContent = best.rating ?? "-";
        document.getElementById("bestConfidence").textContent = (best.confidence ?? "--") + "%";
		document.getElementById("bestCourse").textContent = best.course ?? "-";
		document.getElementById("bestRaceTime").textContent = best.raceTime ?? "-";
		const silk = document.getElementById("bestSilk");

		if (best.silkUrl) {
			silk.src = best.silkUrl;
			silk.style.display = "";
		} else {
			silk.style.display = "none";
		}
		
		await loadMeetings();

    }
    catch (err) {

        console.error(err);

    }

}

async function loadMeetings() {

    try {

        const response = await getMeetings();

        if (!response.success)
            return;

        const container = document.getElementById("meetings");

        container.innerHTML = "";

        response.meetings.forEach(meeting => {

            const card = document.createElement("div");

            card.className = "meeting-card";

			card.innerHTML = `
				<h3>${meeting.name}</h3>
				<p>${meeting.raceCount} races</p>
			`;

			card.addEventListener("click", () => {

				loadRaces(meeting.id, meeting.name);

			});

			container.appendChild(card);

        });

    }
    catch (err) {

        console.error(err);

    }

}
