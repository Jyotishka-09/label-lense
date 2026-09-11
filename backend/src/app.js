/**
 * app.js
 * Express application setup — middleware and route registration.
 */

const express = require("express");
const cors = require("cors");

const healthRouter = require("./routes/health");
const inspectionsRouter = require("./routes/inspections");
const scanRouter = require("./routes/scan");
const complaintsRouter = require("./routes/complaints");
const authorityRouter = require("./routes/authority");

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());   // Parse incoming JSON bodies

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/", healthRouter);
app.use("/api/scan", scanRouter);
app.use("/api", scanRouter);
app.use("/api/inspections", inspectionsRouter);
app.use("/api/complaints", complaintsRouter);
app.use("/api/authority", authorityRouter);

module.exports = app;

