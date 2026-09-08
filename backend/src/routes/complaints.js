/**
 * routes/complaints.js
 * ---------------------
 * In-memory complaint store + REST API.
 *
 * Architecture note:
 *   The `complaints` array is the single source of truth for this process.
 *   To replace with MongoDB/Supabase, swap the helper functions at the bottom
 *   of this file. The route handlers above don't need to change.
 *
 * Endpoints:
 *   POST   /api/complaints            Create a new complaint
 *   GET    /api/complaints            List all (optionally filter by citizenId)
 *   GET    /api/complaints/:id        Get single complaint
 *   PATCH  /api/complaints/:id        Update complaint (status, inspection result)
 */

const express = require("express");
const router = express.Router();

// ── In-memory store ─────────────────────────────────────────────────────────
let complaints = [];
let sequenceCounter = 1;

// ── ID generator ─────────────────────────────────────────────────────────────
function generateId() {
  const year = new Date().getFullYear();
  const seq = String(sequenceCounter++).padStart(4, "0");
  return `LL-${year}-${seq}`;
}

// ── Store helpers (swap these for DB calls) ──────────────────────────────────
function findAll(filter = {}) {
  let result = [...complaints];
  if (filter.citizenId) {
    result = result.filter((c) => c.citizenId === filter.citizenId);
  }
  // Newest first
  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function findById(id) {
  return complaints.find((c) => c.id === id) || null;
}

function insert(data) {
  const record = {
    id: generateId(),
    citizenId: data.citizenId || "anonymous",
    citizenName: data.citizenName || "Anonymous Citizen",
    createdAt: new Date().toISOString(),
    status: "SUBMITTED",

    // Product info (from scan + citizen input)
    productName: data.productName || "Packaged Commodity",
    brand: data.brand || "",
    category: data.category || "General Packaged Commodity",
    sourceType: data.sourceType || "Retail Store",
    location: data.location || "Location not specified",
    pincode: data.pincode || "",

    // Citizen input
    issueCategory: data.issueCategory || "Other",
    citizenDescription: data.citizenDescription || "",
    citizenContact: data.citizenContact || "Anonymous",

    // From scan pipeline
    extractedData: data.extractedData || {},
    aiFindings: data.aiFindings || { overallStatus: "REVIEW", declarations: [] },

    // Images (stored as metadata — previewUrls from frontend)
    citizenImages: data.citizenImages || [],

    // Inspector workflow (filled later via PATCH)
    inspectorImages: [],
    freshAiAnalysis: null,
    inspectionResult: null,
    officerDecision: null,
    officerRemarks: "",
    inspectionDate: null,
    inspectorId: null,
    inspectorName: null,
    inspectedAt: null,
    inspectionReport: null,
  };
  complaints.unshift(record);
  return record;
}

function patch(id, updates) {
  const idx = complaints.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  complaints[idx] = { ...complaints[idx], ...updates };
  return complaints[idx];
}

// ── Route Handlers ────────────────────────────────────────────────────────────

// POST /api/complaints
router.post("/", (req, res) => {
  const data = req.body;

  if (!data || !data.productName) {
    return res.status(400).json({
      success: false,
      message: "productName is required.",
    });
  }

  const record = insert(data);
  console.log(`[Complaints] Created complaint ${record.id} — "${record.productName}"`);
  return res.status(201).json({ success: true, complaint: record });
});

// GET /api/complaints
router.get("/", (req, res) => {
  const { citizenId } = req.query;
  const result = findAll(citizenId ? { citizenId } : {});
  return res.json({ success: true, complaints: result, total: result.length });
});

// GET /api/complaints/:id
router.get("/:id", (req, res) => {
  const record = findById(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, message: `Complaint ${req.params.id} not found.` });
  }
  return res.json({ success: true, complaint: record });
});

// PATCH /api/complaints/:id
router.patch("/:id", (req, res) => {
  const updates = req.body;

  // Prevent overwriting the ID
  delete updates.id;
  delete updates.createdAt;

  const updated = patch(req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ success: false, message: `Complaint ${req.params.id} not found.` });
  }

  console.log(`[Complaints] Updated complaint ${updated.id} — status: ${updated.status}`);
  return res.json({ success: true, complaint: updated });
});

module.exports = router;
