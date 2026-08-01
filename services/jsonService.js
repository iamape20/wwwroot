const fs = require("fs");
const path = require("path");

// process.cwd() is the reliable way to find your project's root folder
// inside a Vercel function — __dirname can behave unpredictably once
// Vercel bundles your code, so we deliberately avoid it here.
const JSON_FOLDER = path.join(process.cwd(), "json");

function getFilePath(fileName) {
    return path.join(JSON_FOLDER, fileName);
}

function load(fileName) {

    const filePath = getFilePath(fileName);

    if (!fs.existsSync(filePath)) {
        throw new Error(`JSON file not found: ${fileName}`);
    }

    // No caching needed: this function only ever runs once per request,
    // in a fresh process, so there's nothing to cache between calls.
    return JSON.parse(fs.readFileSync(filePath, "utf8"));

}

module.exports = {
    load
};
