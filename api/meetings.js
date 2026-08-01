const meetingsService = require("../services/meetingsService");

module.exports = (req, res) => {

    try {
        res.json({
            success: true,
            meetings: meetingsService.getMeetings()
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }

};
