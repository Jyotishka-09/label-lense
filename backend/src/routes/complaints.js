/**
 * routes/complaints.js
 * ---------------------
 * In-memory task / complaint / inspection store + REST API.
 *
 * Source column allowed values:
 *   'authority_assigned'
 *   'consumer_complaint'
 *
 * Backfill rule:
 *   complaint_id IS NOT NULL -> 'consumer_complaint'
 *   complaint_id IS NULL     -> 'authority_assigned'
 *
 * Endpoints:
 *   POST   /api/complaints            Create a new task / complaint
 *   GET    /api/complaints            List all (filter by citizenId, source, status)
 *   GET    /api/complaints/:id        Get single task / complaint
 *   PATCH  /api/complaints/:id        Update task / complaint (status, inspection result)
 */
const express = require("express");
const router = express.Router();
const { findNearestEligibleInspector, normalizeLocation } = require("../services/geoRoutingService");

// ── In-memory store ─────────────────────────────────────────────────────────
let sequenceCounter = 1;

function generateId() {
  const year = new Date().getFullYear();
  const seq = String(sequenceCounter++).padStart(4, "0");
  return `LL-${year}-${seq}`;
}

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "complaints.json");

// Load real records from persistent disk store if present
function loadRecords() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("[Complaints] Could not read complaints.json:", e.message);
    }
  }
  return [];
}

function saveRecords() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(complaints, null, 2), "utf-8");
  } catch (e) {
    console.warn("[Complaints] Could not write complaints.json:", e.message);
  }
}

// Initialize store with real records only (starts with 0 tasks when database is empty)
let complaints = loadRecords();

// Synchronize sequenceCounter with existing real records
if (complaints.length > 0) {
  const ids = complaints.map((c) => {
    const m = (c.id || "").match(/LL-\d{4}-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  sequenceCounter = Math.max(...ids, 0) + 1;
}

// ── Backfill Existing Records ────────────────────────────────────────────────
/**
 * Backfill rule:
 *   complaint_id IS NOT NULL -> 'consumer_complaint'
 *   complaint_id IS NULL     -> 'authority_assigned'
 *
 * Ensures all existing and loaded records have a valid source field.
 */
function backfillTaskSources(records) {
  for (const r of records) {
    if (r.complaint_id !== undefined && r.complaint_id !== null) {
      r.source = "consumer_complaint";
    } else {
      r.source = "authority_assigned";
      if (r.complaint_id === undefined) {
        r.complaint_id = null;
      }
    }
    if (!Array.isArray(r.reportedIssues) || r.reportedIssues.length === 0) {
      r.reportedIssues = r.issueCategory ? [r.issueCategory] : ["Other Labelling Violation"];
    }
    if (r.otherIssueDescription === undefined) {
      r.otherIssueDescription = "";
    }
  }
}

// Run backfill on initialization
backfillTaskSources(complaints);

// ── Store helpers (swap these for DB calls) ──────────────────────────────────
function findAll(filter = {}) {
  let result = [...complaints];
  if (filter.citizenId) {
    result = result.filter((c) => c.citizenId === filter.citizenId);
  }
  if (filter.source) {
    result = result.filter((c) => c.source === filter.source);
  }
  if (filter.status) {
    result = result.filter((c) => c.status === filter.status);
  }
  if (filter.inspectorId) {
    result = result.filter((c) => c.inspectorId === filter.inspectorId);
  }
  if (filter.state && filter.state !== 'ALL') {
    const targetState = filter.state.trim().toLowerCase();
    result = result.filter((c) => {
      const st = (c.state || '').trim().toLowerCase();
      if (st) return st === targetState;
      return (c.location || '').toLowerCase().includes(targetState);
    });
  }
  if (filter.district && filter.district !== 'ALL') {
    const targetDistrict = filter.district.trim().toLowerCase();
    result = result.filter((c) => {
      const dt = (c.district || '').trim().toLowerCase();
      if (dt) return dt === targetDistrict;
      return (c.location || '').toLowerCase().includes(targetDistrict);
    });
  }
  if (filter.locality && filter.locality !== 'ALL') {
    const targetLoc = filter.locality.trim().toLowerCase();
    result = result.filter((c) => {
      const loc = (c.locality || c.location || '').trim().toLowerCase();
      return loc.includes(targetLoc);
    });
  }
  // Newest first
  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function findById(id) {
  return complaints.find((c) => c.id === id) || null;
}

function insert(data) {
  const newId = generateId();

  // Determine source and complaint_id:
  // When creating a task from a consumer complaint: source = 'consumer_complaint'
  // When creating an authority/routine task: source = 'authority_assigned'
  let source = data.source;
  let complaintId = data.complaint_id !== undefined ? data.complaint_id : (data.complaintId !== undefined ? data.complaintId : null);

  if (!source) {
    if (complaintId !== null) {
      source = "consumer_complaint";
    } else if (data.isAuthorityTask || data.citizenId === "authority") {
      source = "authority_assigned";
      complaintId = null;
    } else {
      // Default creation from citizen portal is a consumer complaint
      source = "consumer_complaint";
      complaintId = newId;
    }
  } else if (source === "consumer_complaint" && complaintId === null) {
    complaintId = newId;
  } else if (source === "authority_assigned") {
    complaintId = null;
  }

  // Automatic nearest eligible inspector routing
  const rawLocation = (data.location || data.location_address || "").trim();
  const routing = findNearestEligibleInspector({
    latitude: data.latitude,
    longitude: data.longitude,
    pincode: data.pincode,
    state: data.state,
    district: data.district,
    locality: data.locality,
    location: rawLocation,
  });

  const normLoc = routing.normalizedLocation || {};

  const assignedInspectorId = data.inspectorId !== undefined ? data.inspectorId : routing.inspectorId;
  const assignedInspectorName = data.inspectorName !== undefined ? data.inspectorName : routing.inspectorName;
  const assignmentStatus = data.assignmentStatus || routing.assignmentStatus;

  const record = {
    id: newId,
    complaint_id: complaintId,
    source: source,
    citizenId: data.citizenId || (source === "authority_assigned" ? "authority" : "anonymous"),
    citizenName: data.citizenName || (source === "authority_assigned" ? "Authority Portal" : "Anonymous Citizen"),
    createdAt: new Date().toISOString(),
    status: data.status || "SUBMITTED",

    // Product info (from scan + citizen input)
    productName: data.productName || "Packaged Commodity",
    brand: data.brand || "",
    category: data.category || "General Packaged Commodity",
    sourceType: data.sourceType || "Retail Store",
    
    // Complaint Location & Administrative Details
    location: rawLocation || "Location not specified",
    location_address: data.location_address || rawLocation || "",
    latitude: data.latitude != null ? Number(data.latitude) : (normLoc.latitude ?? null),
    longitude: data.longitude != null ? Number(data.longitude) : (normLoc.longitude ?? null),
    state: data.state || normLoc.state || "",
    district: data.district || normLoc.district || "",
    locality: data.locality || normLoc.locality || "",
    pincode: data.pincode || normLoc.pincode || "",

    // Nearest Inspector Routing & Assignment
    inspectorId: assignedInspectorId,
    inspectorName: assignedInspectorName,
    assignmentStatus: assignmentStatus,
    assignmentReason: routing.reason,
    assignedAt: assignedInspectorId ? (data.assignedAt || new Date().toISOString()) : null,

    // Citizen / Task input
    reportedIssues: Array.isArray(data.reportedIssues) && data.reportedIssues.length > 0
      ? data.reportedIssues
      : Array.isArray(data.issues) && data.issues.length > 0
        ? data.issues
        : [data.issueCategory || "Other Labelling Violation"],
    otherIssueDescription: (data.otherIssueDescription || data.other_issue || "").trim(),
    issueCategory: data.issueCategory || (Array.isArray(data.reportedIssues) && data.reportedIssues[0]) || (Array.isArray(data.issues) && data.issues[0]) || "Other Labelling Violation",
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
    inspectedAt: null,
    inspectionReport: null,
  };

  complaints.unshift(record);
  saveRecords();
  return record;
}

function patch(id, updates) {
  const idx = complaints.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  complaints[idx] = { ...complaints[idx], ...updates };
  saveRecords();
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

  // Enforce valid complaint location
  const loc = (data.location || data.location_address || "").trim();
  if (!loc || loc === "Location not specified") {
    return res.status(400).json({
      success: false,
      message: "Please select the location where the issue was observed.",
    });
  }

  const record = insert(data);
  console.log(`[Complaints] Created ${record.source} task ${record.id} — "${record.productName}" [Assigned: ${record.inspectorId || 'PENDING'}]`);
  return res.status(201).json({ success: true, complaint: record });
});

// Helper to determine if a status is considered completed
function isCompletedStatus(status) {
  const s = (status || "").toUpperCase().trim();
  return s === "INSPECTION_COMPLETED" || s === "INSPECTION COMPLETED" || s === "COMPLETED" || s === "CLOSED" || s === "RESOLVED";
}

// GET /api/complaints
router.get("/", (req, res) => {
  const { citizenId, source, status, inspectorId, state, district, area, locality } = req.query;

  // Server-side Authority geographic scope enforcement
  const scopeState = req.headers["x-authority-state"] || req.query.scopeState || null;
  const scopeDistrict = req.headers["x-authority-district"] || req.query.scopeDistrict || null;

  if (scopeState && state && state !== "ALL" && state.trim().toLowerCase() !== scopeState.trim().toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: `Access denied: Authority is restricted to ${scopeState}.`,
    });
  }
  if (scopeDistrict && district && district !== "ALL" && district.trim().toLowerCase() !== scopeDistrict.trim().toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: `Access denied: Authority is restricted to district ${scopeDistrict}.`,
    });
  }

  const effectiveState = scopeState || state;
  const effectiveDistrict = scopeDistrict || district;
  const effectiveArea = locality || area;

  const filter = {};
  if (citizenId) filter.citizenId = citizenId;
  if (source) filter.source = source;
  if (status) filter.status = status;
  if (inspectorId) filter.inspectorId = inspectorId;
  if (effectiveState && effectiveState !== "ALL") filter.state = effectiveState;
  if (effectiveDistrict && effectiveDistrict !== "ALL") filter.district = effectiveDistrict;
  if (effectiveArea && effectiveArea !== "ALL") filter.locality = effectiveArea;

  const result = findAll(filter);


  // Compute source metrics across the relevant pool
  // Operational queue counts count ONLY tasks that are not completed
  const allTasks = findAll(citizenId ? { citizenId } : {});
  const authorityOpenCount = allTasks.filter((c) => c.source === "authority_assigned" && !isCompletedStatus(c.status)).length;
  const consumerOpenCount = allTasks.filter((c) => c.source === "consumer_complaint" && !isCompletedStatus(c.status)).length;
  const authorityTotalCount = allTasks.filter((c) => c.source === "authority_assigned").length;
  const consumerTotalCount = allTasks.filter((c) => c.source === "consumer_complaint").length;

  return res.json({
    success: true,
    complaints: result,
    total: result.length,
    counts: {
      total: allTasks.length,
      authority_assigned: authorityOpenCount,
      consumer_complaint: consumerOpenCount,
      authority_assigned_open: authorityOpenCount,
      consumer_complaint_open: consumerOpenCount,
      authority_assigned_total: authorityTotalCount,
      consumer_complaint_total: consumerTotalCount,
    },
  });
});

// GET /api/complaints/:id
router.get("/:id", (req, res) => {
  const record = findById(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, message: `Task / Complaint ${req.params.id} not found.` });
  }
  return res.json({ success: true, complaint: record });
});

// PATCH /api/complaints/:id
router.patch("/:id", (req, res) => {
  const updates = req.body;

  // Prevent overwriting immutable fields
  delete updates.id;
  delete updates.createdAt;
  delete updates.source;
  delete updates.complaint_id;

  const updated = patch(req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ success: false, message: `Task / Complaint ${req.params.id} not found.` });
  }

  console.log(`[Complaints] Updated task ${updated.id} — status: ${updated.status}`);
  return res.json({ success: true, complaint: updated });
});

module.exports = router;

