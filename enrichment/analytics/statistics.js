module.exports = function buildStatistics(results, field, outputKey = "name") {

    const map = {};

    for (const race of results) {

        const value = race[field];

        if (!value)
            continue;

        if (!map[value]) {

            map[value] = {

                [outputKey]: value,

                runs: 0,
                wins: 0,
                places: 0

            };

        }

        map[value].runs++;

        const position = Number(race.position ?? race.pos);

        if (position === 1)
            map[value].wins++;

        if (position >= 1 && position <= 3)
            map[value].places++;

    }

    return Object.values(map)

        .map(item => ({

            ...item,

            win_rate: Number(
                ((item.wins / item.runs) * 100).toFixed(1)
            ),

            place_rate: Number(
                ((item.places / item.runs) * 100).toFixed(1)
            )

        }))

        .sort((a, b) => b.runs - a.runs);

};