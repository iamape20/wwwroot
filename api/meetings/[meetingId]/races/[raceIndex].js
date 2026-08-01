const raceService = require("../../../../services/raceService");

module.exports = (req, res) => {

    try {

        // Both dynamic pieces of the URL — from the [meetingId] and
        // [raceIndex] folder/file names — arrive together in req.query.
        const { meetingId, raceIndex } = req.query;

        const result = raceService.getRace(meetingId, raceIndex);

        res.json({
            success: true,
            ...result
        });

    }
    catch (err) {
        res.status(404).json({
            success: false,
            error: err.message
        });
    }

};
