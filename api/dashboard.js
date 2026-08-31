'use strict';

const dashboardService = require('../services/dashboardService');

// ============================================================================
// EPR DASHBOARD API
// ============================================================================
// Vercel serverless function.
//
// Keep this handler deliberately thin.
// All dashboard business logic remains in dashboardService.js.
// ============================================================================

module.exports = async function handler(req, res) {

    // Only GET is supported.
    if (req.method !== 'GET') {

        res.status(405).json({
            success: false,
            error: 'Method Not Allowed'
        });

        return;
    }

    try {

        const dashboard =
            dashboardService.getDashboard();

        res.status(200).json(dashboard);

    }
    catch (err) {

        console.error(
            '[dashboard] Failed to build dashboard:',
            err
        );

        res.status(500).json({
            success: false,
            error:
                err?.message ||
                'Unable to load dashboard'
        });

    }

};