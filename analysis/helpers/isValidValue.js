module.exports = function isValidValue(value) {

    if (value === null || value === undefined)
        return false;

    const text = String(value).trim().toLowerCase();

    return text !== "" &&
           text !== "null" &&
           text !== "undefined" &&
           text !== "n/a";
};