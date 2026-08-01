const fs = require("fs").promises;
const path = require("path");


const ROOT_DIR = path.join(__dirname, "..", "..");
const HORSE_DIR = path.join(ROOT_DIR, "json", "horses");
const HISTORY_DIR = path.join(ROOT_DIR, "json", "history");

const buildStatistics = require("./analytics/statistics");
	
async function run() {

    console.log("📊 Step 6 : Building Horse History...");

    await fs.mkdir(HISTORY_DIR, { recursive: true });

    const files = await fs.readdir(HORSE_DIR);

    const horseFiles = files.filter(f => f.endsWith(".json"));

    console.log(`Found ${horseFiles.length} horse files.`);

    for (const file of horseFiles) {

        try {

            const filename = path.join(HORSE_DIR, file);

            const horse = JSON.parse(
                await fs.readFile(filename, "utf8")
            );

            if (!horse.id || !horse.past_results) {

                console.log(`⚠ Skipping ${file}`);

                continue;

            }

			const results = Array.isArray(horse.past_results)
				? horse.past_results
				: [];

			const runs = results.length;

			const wins = results.filter(r => Number(r.position ?? r.pos) === 1).length;

			const places = results.filter(r => {
				const position = Number(r.position ?? r.pos);
				return position >= 1 && position <= 3;
			}).length;

			const validPositions = results
				.map(r => Number(r.position ?? r.pos))
				.filter(Number.isFinite);

			const validFields = results
				.map(r => Number(r.runner_count ?? r.runners))
				.filter(Number.isFinite);
				
			const averagePosition = validPositions.length
				? Number(
					(validPositions.reduce((a, b) => a + b, 0) / validPositions.length)
						.toFixed(2)
				  )
				: 0;

			const averageFieldSize = validFields.length
				? Number(
					(validFields.reduce((a, b) => a + b, 0) / validFields.length)
						.toFixed(2)
				  )
				: 0;
	
			const recent3 = results
				.slice(0, 3)
				.map(r => Number(r.position ?? r.pos))
				.filter(Number.isFinite);

			const recent5 = results
				.slice(0, 5)
				.map(r => Number(r.position ?? r.pos))
				.filter(Number.isFinite);

			const averageRecent3 = recent3.length
				? Number(
					(recent3.reduce((a, b) => a + b, 0) / recent3.length)
						.toFixed(2)
				  )
				: 0;

			const averageRecent5 = recent5.length
				? Number(
					(recent5.reduce((a, b) => a + b, 0) / recent5.length)
						.toFixed(2)
				  )
				: 0;
				
			const trendChange = Number(
				(averagePosition - averageRecent5).toFixed(2)
			);

			let trendDirection = "stable";

			if (trendChange >= 1.0) {
				trendDirection = "improving";
			}
			else if (trendChange <= -1.0) {
				trendDirection = "declining";
			}

			const variance = validPositions.length
				? validPositions.reduce(
					(sum, position) => sum + Math.pow(position - averagePosition, 2),
					0
				  ) / validPositions.length
				: 0;

			const standardDeviation = Number(Math.sqrt(variance).toFixed(2));

			let trendRating = 50;

			if (trendDirection === "improving") {
				trendRating = Math.min(100, 50 + Math.round(trendChange * 20));
			}
			else if (trendDirection === "declining") {
				trendRating = Math.max(0, 50 + Math.round(trendChange * 20));
			}

			let consistencyScore = Math.max(
				0,
				Math.min(100, Math.round(100 - (standardDeviation * 10)))
			);

			let consistencyRating = "Very Inconsistent";

			if (consistencyScore >= 85)
				consistencyRating = "Excellent";
			else if (consistencyScore >= 70)
				consistencyRating = "Very Consistent";
			else if (consistencyScore >= 55)
				consistencyRating = "Consistent";
			else if (consistencyScore >= 40)
				consistencyRating = "Variable";				


			const courseStatistics   = buildStatistics(results, "course", "course");
			const distanceStatistics = buildStatistics(results, "dist", "distance");
			const goingStatistics    = buildStatistics(results, "going", "going");
			const trainerStatistics  = buildStatistics(results, "trainer", "trainer");
			const jockeyStatistics = buildStatistics(results, "jockey", "jockey");
			const classStatistics  = buildStatistics(results, "class", "class");


			const history = {

				id: horse.id,

				name: horse.name,

				summary: {

					overall: {

						runs,

						wins,

						places,

						win_rate:
							runs ? Number(((wins / runs) * 100).toFixed(1)) : 0,

						place_rate:
							runs ? Number(((places / runs) * 100).toFixed(1)) : 0

					},

				performance: {

					average_position: averagePosition,

					average_field_size: averageFieldSize,

					last_3_finishes: recent3,

					last_5_finishes: recent5,

					average_last_3: averageRecent3,

					average_last_5: averageRecent5

				},

				trend: {

					direction: trendDirection,

					change: trendChange,

					rating: trendRating

				},

				consistency: {

					score: consistencyScore,

					rating: consistencyRating,

					standard_deviation: standardDeviation,

					average_finish: averagePosition

				},

				course: {

					total_courses: courseStatistics.length,

					courses: courseStatistics

				},

				distance: {

					total_distances: distanceStatistics.length,

					distances: distanceStatistics

				},

				going: {

					total_conditions: goingStatistics.length,

					conditions: goingStatistics

				},

				trainer: {

					total_trainers: trainerStatistics.length,

					trainers: trainerStatistics

				},

				jockey: {

					total_jockeys: jockeyStatistics.length,

					jockeys: jockeyStatistics

				},

				class: {

					total_classes: classStatistics.length,

					classes: classStatistics

				}
				
				}

			};

            await fs.writeFile(

                path.join(HISTORY_DIR, file),

                JSON.stringify(history, null, 2)

            );

            console.log(`✓ ${horse.name}`);

        }

        catch (err) {

            console.log(`❌ ${file} : ${err.message}`);

        }

    }

    console.log("✅ Horse History Complete");

}

run();