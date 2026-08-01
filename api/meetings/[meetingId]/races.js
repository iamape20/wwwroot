const racesService = require("../../../services/racesService");

module.exports = (req, res) => {

    try {

        // IMPORTANT: Vercel puts dynamic route segments (from the
        // [meetingId] folder name) into req.query — NOT req.params
        // like Express does. This is the one real behavior change
        // in this whole conversion.
        const { meetingId } = req.query;

        const result = racesService.getRaces(meetingId);

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
