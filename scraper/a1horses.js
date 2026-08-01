// a1horses.js
const fs = require("fs").promises; // Non-blocking file operations
const path = require("path"); 
const { XMLParser } = require("fast-xml-parser");

const ROOT_DIR = path.join(__dirname, '..'); 
const CARDS_FILE = path.join(ROOT_DIR, 'json', 'stage2_cards.json');
const XML_DIR = path.join(ROOT_DIR, 'xml');
const HORSE_DIR = path.join(ROOT_DIR, 'json', 'horses');
const COURSE_CODES = {

    "Aintree":"AIN",
    "Ascot":"ASC",
    "Bath":"BAT",
    "Beverley":"BEV",
    "Brighton":"BRI",
    "Carlisle":"CAR",
    "Catterick":"CAT",
    "Chelmsford":"CHE",
    "Chepstow":"CHP",
    "Chester":"CHR",
    "Doncaster":"DON",
    "Epsom":"EPS",
    "Ffos Las":"FFL",
    "Goodwood":"GOOD",
    "Hamilton":"HAM",
    "Haydock":"HAY",
    "Kempton":"KEM",
    "Leicester":"LEI",
    "Lingfield":"LIN",
    "Newbury":"NEW",
    "Newcastle":"NCL",
    "Nottingham":"NOT",
    "Ripon":"RIP",
    "Sandown":"SAN",
    "Thirsk":"THI",
    "Windsor":"WIN",
    "Wolverhampton":"WOL",
    "York":"YOR"

};

function getCourseCode(course){

    if (!course) return null;

    return COURSE_CODES[course] || course.substring(0,3).toUpperCase();

}

function cleanDistText(dist) {

    if (!dist) return null;

    const text = String(dist)
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const match = text.match(
        /(\d+m\s*\d+f\s*\d+y)|(\d+m\s*\d+f)|(\d+m)|(\d+f)/i
    );

    return match ? match[0].toLowerCase() : text;
}

function distanceToFurlongs(dist) {

    if (!dist) return null;

    const text = cleanDistText(dist);

    const miles = parseInt((text.match(/(\d+)m/) || [0,0])[1],10);
    const furlongs = parseInt((text.match(/(\d+)f/) || [0,0])[1],10);
    const yards = parseInt((text.match(/(\d+)y/) || [0,0])[1],10);

    return Number(
        (
            (miles * 8) +
            furlongs +
            (yards / 220)
        ).toFixed(2)
    );
}

function getCourseCode(course){

    if (!course) return null;

    return COURSE_CODES[course] || course.substring(0,3).toUpperCase();

}

async function run() {
	
    console.log("🛠️  Step 5: Processing XML Profiles into Clean JSON...");

    const parser = new XMLParser({ 
        ignoreAttributes: false, 
        parseTagValue: true,
        allowBooleanAttributes: true 
    });

    try {
        await fs.mkdir(HORSE_DIR, { recursive: true });

        try {
            await fs.access(CARDS_FILE);
        } catch {
            return console.error("❌ Error: stage2_cards.json not found. Run a1cards.js first.");
        }

        const cardsContent = await fs.readFile(CARDS_FILE, 'utf8');
        const cards = JSON.parse(cardsContent);
        const validIds = new Set();

        Object.values(cards).forEach(meeting => {
            meeting.races.forEach(race => {
                race.runners.forEach(runner => {
                    if (runner.id) validIds.add(runner.id.toString());
                });
            });
        });

        console.log(`--- Processing ${validIds.size} Unique Horse Profiles ---`);

        // Switch to an asynchronous for...of loop to prevent event loop starvation
        for (const id of validIds) {
            const xmlPath = path.join(XML_DIR, `${id}.xml`);
            
            try {
                await fs.access(xmlPath);
            } catch {
                continue; // Skip missing files safely
            }

            try {
                const xmlRaw = await fs.readFile(xmlPath, 'utf8');
                const jsonObj = parser.parse(xmlRaw);
                
                let hName = "Unknown";
                let hAge = "??";
                let hSilk = "";
                let hResults = [];
                let hTimeform = { star_rating: 0, comment: "" };

                const search = (obj) => {
                    if (!obj || typeof obj !== 'object') return;

                    if (obj.horse_name || obj.name) {
                        if (hName === "Unknown") hName = obj.horse_name || obj.name;
                    }
                    if (obj.age && hAge === "??") hAge = obj.age;

                    if (obj.timeform_star_rating) hTimeform.star_rating = parseInt(obj.timeform_star_rating, 10) || 0;
                    if (obj.ride_description) hTimeform.comment = obj.ride_description;
                    if (obj.silk_filename && obj.silk_filename !== "null") {
                        if (!hSilk) hSilk = obj.silk_filename;
                    }

                    for (let k in obj) {
                        const val = obj[k];
                        if (Array.isArray(val)) {
                            if (val[0] && (val[0].date || val[0].course_name || val[0].venue_name)) {
                                hResults = val;
                            }
                        } else if (typeof val === 'object' && val !== null) {
                            search(val); 
                        }
                    }
                };

                search(jsonObj);

                const cleanResults = hResults
                    .filter(run => run.position || run.finish_position || run.date)
                    .map(run => {
                        const rClass = run.race_class || run.classification || (run.race && run.race.class) || null;
                        const rawDate = run.date || "";
                        const cleanDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
                        const rawDist = run.distance_description || run.distance || "";


						return {
							date: cleanDate,
							pos: Number(run.position || run.finish_position || 0),
							win: Number(run.position || run.finish_position) === 1,
							place: (() => {
								const pos = Number(run.position || run.finish_position);
								return pos > 0 && pos <= 3;
							})(),
							runners: Number(run.runner_count || 0),
							course: run.course_name || run.venue_name || "Unknown",
							course_code: getCourseCode(
								run.course_name || run.venue_name || "Unknown"
							),

							dist: cleanDistText(rawDist),
							distance_furlongs: distanceToFurlongs(rawDist),
							class: rClass,
							weight: run.weight || run.handicap || "N/A",
							weight_st: run.weight_in_stone || null,
							going: run.going || run.ground || "N/A",
							odds: run.odds || "N/A",
							draw: run.draw ?? null,
							official_rating: run.or ?? null,bha: run.bha ?? null,
							trainer: run.trainer_name ?? null,
							trainer_id: run.trainer_id ?? null,
							jockey: run.jockey_name ?? null,
							jockey_id: run.jockey_id ?? null,
							ride_description: run.ride_description ?? "",
							beaten_lengths:
								run.beaten_distance ??
								run.distance_beaten ??
								run.beaten_lengths ??
								null,
							race_name: run.race_name ?? null,
							position_in_market: run.position_in_market ?? null,
							favourite:
								run.favourite_flag === true ||
								run.favourite_flag === "true",
							race_type: run.run_type ?? null,
							handicap: !!run.handicap_race,
							novice: !!run.novice_race,
							mares: !!run.mares_race,
							prize: run.race_prize_winner ?? null
						};

});

				cleanResults.sort((a, b) => new Date(b.date) - new Date(a.date));
				const validatedResults = cleanResults.filter(run => {
					if (!run.date) return false;
					if (isNaN(new Date(run.date).getTime())) return false;
					return true;
				});

				cleanResults.length = 0;
				cleanResults.push(...validatedResults);
				for (let i = 0; i < cleanResults.length - 1; i++) {
					const current = new Date(cleanResults[i].date);
					const previous = new Date(cleanResults[i + 1].date);
					cleanResults[i].days_since_previous_run =
						Math.round((current - previous) / 86400000);
				}

				if (cleanResults.length) {
					cleanResults[cleanResults.length - 1].days_since_previous_run = null;
				}
				const lastRun = cleanResults[0] || {};

                const finalJson = {
                    id: id,
                    name: hName.toUpperCase(),
                    age: hAge,
					going: lastRun.going || null,
                    silk_filename: hSilk,
                    last_run_date: lastRun.date || null,
                    last_run_class: lastRun.class || null,
                    timeform_info: hTimeform,
                    past_results: cleanResults 
                };

                await fs.writeFile(
                    path.join(HORSE_DIR, `${id}.json`), 
                    JSON.stringify(finalJson, null, 2)
                );

                const resStatus = cleanResults.length > 0 ? "✅" : "⚠️ No Form";
                console.log(`   [${id}] ${finalJson.name.padEnd(25)} | Results: ${resStatus} (${cleanResults.length})`);

            } catch (e) {
                console.error(`   ❌ Error processing ${id}.xml: ${e.message}`);
            }
        }

        console.log("\n✅ Step 5 Complete: All XMLs converted to cleaned, chronologically-sorted Horse JSONs.");

    } catch (globalError) {
        console.error("❌ Fatal error in Horse Processor pipeline:", globalError.message);
    }
}

run();