const dashboardService = require("../services/dashboardService");

// A Vercel function file exports a single handler function directly —
// no express.Router(), no app.listen(). Vercel calls this function
// itself whenever a request hits /api/dashboard.
module.exports = (req, res) => {

    try {
        res.json(dashboardService.getDashboard());
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }

};
