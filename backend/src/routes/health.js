/**
 * routes/health.js
 * Health-check endpoint for the Express backend.
 */

const express = require("express");
const router = express.Router();

// GET /
// Returns a simple JSON confirming the backend is running.
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Label Lens — Express Backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
