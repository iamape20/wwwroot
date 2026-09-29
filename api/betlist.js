const json = require("../services/jsonService");

// Serves json/bet_list.json, written by the root pipeline's js/betList.js
// (every odds refresh). Never cached - the horse is revealed only shortly
// before each off, so a stale copy would hide or delay a bet.
module.exports = (req, res) => {

    res.setHeader("Cache-Control", "no-store");

    try {
        res.json({ success: true, ...json.load("bet_list.json") });
    }
    catch (err) {
        res.status(404).json({ success: false, error: err.message });
    }

};
