module.exports = function findRecord(records, property, value) {

    if (!Array.isArray(records))
        return null;

    return records.find(record =>
        String(record[property]).toLowerCase() ===
        String(value).toLowerCase()
    ) || null;

};