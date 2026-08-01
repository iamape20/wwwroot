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

        if (response.race.verdict || response.race.bettingForecast) {

            const summary = document.createElement("div");
            summary.className = "race-summary";

            summary.innerHTML = `
                ${response.race.verdict
                    ? `<p class="race-summary-verdict">${response.race.verdict}</p>`
                    : ""}
                ${response.race.bettingForecast
                    ? `<p class="race-summary-forecast"><strong>Forecast:</strong> ${response.race.bettingForecast}</p>`
                    : ""}
            `;

            container.appendChild(summary);

        }

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

			if (rating >= 55)
				ratingClass = "rating-gold";
			else if (rating >= 40)
				ratingClass = "rating-green";
			else if (rating < 25)
				ratingClass = "rating-grey";

			const confidence = Math.min(runner.elite.confidence, 100);

			card.innerHTML = `

			<div class="runner-row">

				<div class="runner-left">

					<div class="runner-medal">
						${medal}
					</div>

					<div class="runner-cloth">
						${runner.official_no}
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

							T: ${runner.trainer}

							&nbsp;•&nbsp;

							J: ${runner.jockey}

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
				<span class="race-card-time">${toLocalTimeString(race.time)}</span>
				<span class="race-card-meta">Class ${race.class} • ${race.distance}</span>
				<span class="race-card-runners">${race.runners} runners</span>
			`;

			card.addEventListener("click", () => {

				container.querySelectorAll(".race-card")
					.forEach(el => el.classList.remove("active"));

				card.classList.add("active");

				loadRace(meetingId, race.index, toLocalTimeString(race.time));

				document.getElementById("analysisSection")
					.scrollIntoView({ behavior: "smooth", block: "start" });

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

		if (dashboard.nap && dashboard.nap.active) {

			document.getElementById("napCallout").innerHTML = `
				<span class="nap-label">Today's Nap</span>
				<div class="nap-name">${dashboard.nap.name}</div>
				<div class="nap-meta">
					${dashboard.nap.meeting} • ${dashboard.nap.time}
					${dashboard.nap.strength ? ` • ${dashboard.nap.strength}` : ""}
				</div>
			`;

		}

		if (!best) {

			document.getElementById("bestHorse").textContent = "No selections";
			document.getElementById("bestRating").textContent = "ELITE --";
			document.getElementById("bestConfidence").textContent = "Confidence --%";

			return;
		}

        document.getElementById("bestHorse").textContent = best.horse ?? "-";
        document.getElementById("bestRating").textContent = best.rating != null ? `ELITE ${best.rating}` : "-";
        document.getElementById("bestConfidence").textContent = best.confidence != null ? `Confidence ${best.confidence}%` : "--%";
		document.getElementById("bestCourse").textContent = best.course ?? "-";
		document.getElementById("bestRaceTime").textContent = best.raceTime ? toLocalTimeString(best.raceTime) : "-";
		const silk = document.getElementById("bestSilk");

		if (best.silkUrl) {
			silk.src = best.silkUrl;
			silk.style.display = "";
		} else {
			silk.style.display = "none";
		}

		const heroBadge = document.getElementById("heroBadge");

		if (best.meetingId != null && best.raceIndex != null) {

			heroBadge.style.cursor = "pointer";

			heroBadge.onclick = async () => {

				await loadRaces(best.meetingId, best.course);
				await loadRace(best.meetingId, best.raceIndex, toLocalTimeString(best.raceTime));

				document.getElementById("analysisSection")
					.scrollIntoView({ behavior: "smooth", block: "start" });

			};

		}
		
		// Build the global race-time list clock.js needs for the
		// "next race across all courses" countdown. race.time from the
		// API is UTC (matches how the scraper stores it) - apply the
		// same BST-aware conversion used elsewhere on the site so this
		// lines up correctly with getLondonTime()'s local totalSecs.
		if (dashboard.raceTimes && typeof getLondonTime === "function") {

			window.allRaceTimes = dashboard.raceTimes.map(r => {

				let [h, m] = r.time.split(":").map(Number);

				h += BST_OFFSET;
				if (h >= 1 && h <= 11) h += 12;
				if (h >= 24) h -= 24;

				return {
					course: r.course,
					displayTime: r.time,
					totalSecs: (h * 3600) + (m * 60)
				};

			}).sort((a, b) => a.totalSecs - b.totalSecs);

			if (!window.timerPool?.liveClock) {
				window.timerPool ??= {};
				window.timerPool.liveClock = setInterval(updateClock, 1000);
				updateClock();
			}

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
            card.dataset.meetingId = meeting.id;

			card.innerHTML = `
				<span class="meeting-card-name">${meeting.name}</span>
				<span class="meeting-card-count">${meeting.raceCount}</span>
			`;

			card.addEventListener("click", () => {

				container.querySelectorAll(".meeting-card")
					.forEach(el => el.classList.remove("active"));

				card.classList.add("active");

				loadRaces(meeting.id, meeting.name);

			});

			container.appendChild(card);

        });

    }
    catch (err) {

        console.error(err);

    }

}
