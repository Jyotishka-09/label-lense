/**
 * routes/authority.js
 * -------------------
 * Authority Supervisory API Layer:
 * - Overview KPI Telemetry
 * - Geographic Master-Data & Incident Heatmap Aggregation
 * - Inspector Directory, Search, Workloads & History
 * - Risk Aggregation by Category & Violation Typology
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const DATA_FILE = path.join(__dirname, "../../data/complaints.json");

// Helper: load real records
function getComplaints() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("[Authority API] Could not read complaints.json:", e.message);
    }
  }
  return [];
}

const isCompletedStatus = (status) => {
  const s = (status || "").toUpperCase().trim();
  return s === "INSPECTION_COMPLETED" || s === "INSPECTION COMPLETED" || s === "COMPLETED" || s === "CLOSED" || s === "RESOLVED";
};

const { GEO_MASTER, INSPECTORS_MASTER } = require("../services/geoRoutingService");
const { INDIA_GEO_MASTER, getAllStates, getDistrictsForState, findState } = require("../data/indiaGeoMaster");


// ── GET /api/authority/overview ─────────────────────────────────────────────
router.get("/overview", (req, res) => {
  const complaints = getComplaints();

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "SUBMITTED" || c.status === "PENDING").length;
  const underInspection = complaints.filter((c) => c.status === "UNDER_REVIEW" || c.status === "INSPECTION_IN_PROGRESS").length;
  const completed = complaints.filter((c) => isCompletedStatus(c.status)).length;

  const authorityAssigned = complaints.filter((c) => c.source === "authority_assigned").length;
  const consumerComplaints = complaints.filter((c) => c.source === "consumer_complaint").length;

  const authorityOpen = complaints.filter((c) => c.source === "authority_assigned" && !isCompletedStatus(c.status)).length;
  const consumerOpen = complaints.filter((c) => c.source === "consumer_complaint" && !isCompletedStatus(c.status)).length;

  const nonCompliant = complaints.filter(
    (c) => c.officerDecision === "NON_COMPLIANT" || c.inspectionResult === "NON_COMPLIANT"
  ).length;
  const compliant = complaints.filter(
    (c) => c.officerDecision === "COMPLIANT" || c.inspectionResult === "COMPLIANT"
  ).length;

  const complianceRate = completed > 0 ? Math.round((compliant / completed) * 100) : 100;
  const violationRate = completed > 0 ? Math.round((nonCompliant / completed) * 100) : 0;

  return res.json({
    success: true,
    telemetry: {
      total,
      pending,
      underInspection,
      completed,
      operationalQueue: pending + underInspection,
      authorityAssigned,
      consumerComplaints,
      authorityOpen,
      consumerOpen,
      compliant,
      nonCompliant,
      complianceRate,
      violationRate,
    },
  });
});

// ── GET /api/authority/geo ──────────────────────────────────────────────────
router.get("/geo", (req, res) => {
  const { zoneId } = req.query;
  const complaints = getComplaints();

  const aggregatedZones = GEO_MASTER.map((zone) => {
    // Find all complaints matching this zone's pincodes or district
    const zonePincodeSet = new Set(zone.pincodes.map((p) => p.pincode));
    const zoneComplaints = complaints.filter((c) => {
      const pin = String(c.pincode || "").trim();
      const loc = (c.location || "").toLowerCase();
      return zonePincodeSet.has(pin) || loc.includes(zone.district.toLowerCase()) || loc.includes(zone.hq.toLowerCase());
    });

    const zoneTotal = zoneComplaints.length;
    const zonePending = zoneComplaints.filter((c) => c.status === "SUBMITTED" || c.status === "PENDING").length;
    const zoneUnderInspection = zoneComplaints.filter((c) => c.status === "UNDER_REVIEW" || c.status === "INSPECTION_IN_PROGRESS").length;
    const zoneCompleted = zoneComplaints.filter((c) => isCompletedStatus(c.status)).length;
    const zoneViolations = zoneComplaints.filter(
      (c) => c.officerDecision === "NON_COMPLIANT" || c.inspectionResult === "NON_COMPLIANT"
    ).length;

    // Detailed pincode metrics
    const pincodeMetrics = zone.pincodes.map((p) => {
      const pinComplaints = zoneComplaints.filter((c) => String(c.pincode || "").trim() === p.pincode);
      const pinTotal = pinComplaints.length;
      const pinOpen = pinComplaints.filter((c) => !isCompletedStatus(c.status)).length;
      const pinViolations = pinComplaints.filter(
        (c) => c.officerDecision === "NON_COMPLIANT" || c.inspectionResult === "NON_COMPLIANT"
      ).length;

      // Calculate localized risk score: (open * 15) + (violations * 25) + (total * 5)
      const riskScore = Math.min(100, pinOpen * 20 + pinViolations * 30 + pinTotal * 10);
      let riskLevel = "LOW";
      if (riskScore >= 70) riskLevel = "CRITICAL";
      else if (riskScore >= 40) riskLevel = "HIGH";
      else if (riskScore >= 15) riskLevel = "MODERATE";

      return {
        ...p,
        total: pinTotal,
        open: pinOpen,
        violations: pinViolations,
        riskScore,
        riskLevel,
        recentDockets: pinComplaints.slice(0, 3).map((c) => ({
          id: c.id,
          productName: c.productName,
          status: c.status,
          issueCategory: c.issueCategory,
        })),
      };
    });

    const openCount = zonePending + zoneUnderInspection;
    const zoneRiskScore = Math.min(
      100,
      openCount * 15 + zoneViolations * 25 + zoneTotal * 5
    );

    let zoneRiskLevel = "LOW";
    if (zoneRiskScore >= 70) zoneRiskLevel = "CRITICAL";
    else if (zoneRiskScore >= 40) zoneRiskLevel = "HIGH";
    else if (zoneRiskScore >= 15) zoneRiskLevel = "MODERATE";

    return {
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      state: zone.state,
      district: zone.district,
      hq: zone.hq,
      total: zoneTotal,
      pending: zonePending,
      underInspection: zoneUnderInspection,
      completed: zoneCompleted,
      violations: zoneViolations,
      open: openCount,
      riskScore: zoneRiskScore,
      riskLevel: zoneRiskLevel,
      pincodes: pincodeMetrics,
    };
  });

  if (zoneId) {
    const selected = aggregatedZones.find((z) => z.zoneId === zoneId);
    if (!selected) {
      return res.status(404).json({ success: false, message: `Zone ${zoneId} not found.` });
    }
    return res.json({ success: true, zone: selected });
  }

  return res.json({
    success: true,
    totalZones: aggregatedZones.length,
    zones: aggregatedZones,
  });
});

// ── GET /api/authority/inspectors ───────────────────────────────────────────
router.get("/inspectors", (req, res) => {
  const { q } = req.query;
  const complaints = getComplaints();

  const inspectorsWithWorkload = INSPECTORS_MASTER.map((ins) => {
    // Find dockets linked by inspectorId, inspectorName, or jurisdiction pincodes
    const assignedTasks = complaints.filter((c) => {
      const matchId = c.inspectorId === ins.id || c.inspectorId === ins.code;
      const matchName = c.inspectorName && c.inspectorName.toLowerCase().includes(ins.name.toLowerCase());
      const matchJurisdiction = ins.jurisdiction.includes(String(c.pincode || "").trim());
      return matchId || matchName || matchJurisdiction;
    });

    const completedTasks = assignedTasks.filter((c) => isCompletedStatus(c.status));
    const inProgressTasks = assignedTasks.filter(
      (c) => c.status === "UNDER_REVIEW" || c.status === "INSPECTION_IN_PROGRESS"
    );
    const pendingTasks = assignedTasks.filter(
      (c) => c.status === "SUBMITTED" || c.status === "PENDING"
    );

    const violationsDetected = completedTasks.filter(
      (c) => c.officerDecision === "NON_COMPLIANT" || c.inspectionResult === "NON_COMPLIANT"
    ).length;

    const complianceVerified = completedTasks.filter(
      (c) => c.officerDecision === "COMPLIANT" || c.inspectionResult === "COMPLIANT"
    ).length;

    return {
      ...ins,
      workload: {
        totalAssigned: assignedTasks.length,
        pending: pendingTasks.length,
        inProgress: inProgressTasks.length,
        completed: completedTasks.length,
        violationsDetected,
        complianceVerified,
        complianceRate: completedTasks.length > 0 ? Math.round((complianceVerified / completedTasks.length) * 100) : 100,
      },
      recentTasks: assignedTasks.slice(0, 5).map((c) => ({
        id: c.id,
        productName: c.productName,
        status: c.status,
        issueCategory: c.issueCategory,
        location: c.location,
        createdAt: c.createdAt,
      })),
    };
  });

  let results = inspectorsWithWorkload;
  if (q) {
    const query = q.toLowerCase().trim();
    results = results.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.fullName.toLowerCase().includes(query) ||
        i.id.toLowerCase().includes(query) ||
        i.code.toLowerCase().includes(query) ||
        i.division.toLowerCase().includes(query)
    );
  }

  return res.json({
    success: true,
    total: results.length,
    inspectors: results,
  });
});

// ── GET /api/authority/risk ─────────────────────────────────────────────────
router.get("/risk", (req, res) => {
  const complaints = getComplaints();

  // Category Risk Matrix
  const CATEGORY_MAP = {};
  complaints.forEach((c) => {
    const cat = c.category || "General Packaged Commodity";
    if (!CATEGORY_MAP[cat]) {
      CATEGORY_MAP[cat] = { category: cat, total: 0, violations: 0, open: 0, issues: {} };
    }
    CATEGORY_MAP[cat].total += 1;
    if (!isCompletedStatus(c.status)) {
      CATEGORY_MAP[cat].open += 1;
    }
    if (c.officerDecision === "NON_COMPLIANT" || c.inspectionResult === "NON_COMPLIANT") {
      CATEGORY_MAP[cat].violations += 1;
    }
    const issue = c.issueCategory || "Other Labelling Violation";
    CATEGORY_MAP[cat].issues[issue] = (CATEGORY_MAP[cat].issues[issue] || 0) + 1;
  });

  const categoryRiskList = Object.values(CATEGORY_MAP).map((c) => {
    const violationRate = c.total > 0 ? Math.round((c.violations / c.total) * 100) : 0;
    let riskLevel = "LOW";
    if (violationRate >= 50 || c.violations >= 3) riskLevel = "CRITICAL";
    else if (violationRate >= 25 || c.violations >= 2) riskLevel = "HIGH";
    else if (c.open > 0) riskLevel = "MODERATE";

    // Primary issue
    const topIssue = Object.entries(c.issues).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    return {
      category: c.category,
      totalDockets: c.total,
      openDockets: c.open,
      violations: c.violations,
      violationRate,
      riskLevel,
      topIssue,
    };
  });

  // Violation Typology Breakdown
  const VIOLATION_MAP = {};
  complaints.forEach((c) => {
    const issue = c.issueCategory || "Other Labelling Violation";
    if (!VIOLATION_MAP[issue]) {
      VIOLATION_MAP[issue] = { issueCategory: issue, count: 0, resolved: 0, nonCompliant: 0 };
    }
    VIOLATION_MAP[issue].count += 1;
    if (isCompletedStatus(c.status)) {
      VIOLATION_MAP[issue].resolved += 1;
    }
    if (c.officerDecision === "NON_COMPLIANT" || c.inspectionResult === "NON_COMPLIANT") {
      VIOLATION_MAP[issue].nonCompliant += 1;
    }
  });

  const violationTypologies = Object.values(VIOLATION_MAP).map((v) => ({
    ...v,
    percentage: complaints.length > 0 ? Math.round((v.count / complaints.length) * 100) : 0,
    severity: v.nonCompliant > 0 ? "HIGH" : v.count > 2 ? "MODERATE" : "STANDARD",
  }));

  return res.json({
    success: true,
    totalRecordsEvaluated: complaints.length,
    categoryRisk: categoryRiskList,
    violationTypologies,
  });
});

// ── Geographic Location Resolution Helpers ──────────────────────────────────
function resolveComplaintState(c) {
  if (c.state && typeof c.state === "string" && c.state.trim()) {
    return c.state.trim();
  }
  if (c.location && typeof c.location === "string") {
    const locLower = c.location.toLowerCase();
    if (locLower.includes("assam")) return "Assam";
    if (locLower.includes("delhi")) return "Delhi";
    if (locLower.includes("west bengal")) return "West Bengal";
    if (locLower.includes("meghalaya")) return "Meghalaya";
  }
  return null;
}

function resolveComplaintDistrict(c) {
  if (c.district && typeof c.district === "string" && c.district.trim()) {
    return c.district.trim();
  }
  return null;
}

// ── Authority Geographic Scope Enforcement Helper ────────────────────────────
function getAuthorityScope(req) {
  const scopeState =
    req.headers["x-authority-state"] ||
    req.query.scopeState ||
    req.query.stateScope ||
    null;
  const scopeDistrict =
    req.headers["x-authority-district"] ||
    req.query.scopeDistrict ||
    req.query.districtScope ||
    null;
  return {
    scopeState: scopeState ? String(scopeState).trim() : null,
    scopeDistrict: scopeDistrict ? String(scopeDistrict).trim() : null,
  };
}

// ── GET /api/authority/complaints/by-state ──────────────────────────────────
// Returns complaint counts grouped by state (COUNT(complaints) GROUP BY state)
router.get("/complaints/by-state", (req, res) => {
  const scope = getAuthorityScope(req);
  let complaints = getComplaints();

  // Enforce server-side Authority scope
  if (scope.scopeState) {
    complaints = complaints.filter(
      (c) =>
        resolveComplaintState(c)?.toLowerCase() ===
        scope.scopeState.toLowerCase()
    );
  }
  if (scope.scopeDistrict) {
    complaints = complaints.filter(
      (c) =>
        resolveComplaintDistrict(c)?.toLowerCase() ===
        scope.scopeDistrict.toLowerCase()
    );
  }

  // Aggregate by state (database records only)
  const stateCounts = {};
  let totalScopedComplaints = 0;

  complaints.forEach((c) => {
    const st = resolveComplaintState(c);
    if (!st) return; // Skip unlocalized test records without real state
    stateCounts[st] = (stateCounts[st] || 0) + 1;
    totalScopedComplaints += 1;
  });

  const states = Object.entries(stateCounts)
    .map(([state, count]) => ({
      state,
      complaintCount: count,
    }))
    .sort((a, b) => b.complaintCount - a.complaintCount || a.state.localeCompare(b.state));

  return res.json({
    success: true,
    totalStates: states.length,
    totalComplaints: totalScopedComplaints,
    states,
  });
});

// ── GET /api/authority/complaints/by-district ───────────────────────────────
// Returns complaint counts grouped by district for a given state
// (COUNT(complaints) WHERE state = selected_state GROUP BY district)
router.get("/complaints/by-district", (req, res) => {
  const { state } = req.query;
  if (!state || !state.trim()) {
    return res.status(400).json({
      success: false,
      message: "Query parameter 'state' is required.",
    });
  }

  const requestedState = state.trim();
  const scope = getAuthorityScope(req);

  // Enforce server-side Authority scope
  if (
    scope.scopeState &&
    scope.scopeState.toLowerCase() !== requestedState.toLowerCase()
  ) {
    return res.status(403).json({
      success: false,
      message: `Access denied: Authority is restricted to ${scope.scopeState}.`,
    });
  }

  let complaints = getComplaints().filter(
    (c) =>
      resolveComplaintState(c)?.toLowerCase() ===
      requestedState.toLowerCase()
  );

  if (scope.scopeDistrict) {
    complaints = complaints.filter(
      (c) =>
        resolveComplaintDistrict(c)?.toLowerCase() ===
        scope.scopeDistrict.toLowerCase()
    );
  }

  // Aggregate by district
  const districtCounts = {};
  let stateTotalComplaints = 0;

  complaints.forEach((c) => {
    const dt = resolveComplaintDistrict(c) || "Unspecified District";
    districtCounts[dt] = (districtCounts[dt] || 0) + 1;
    stateTotalComplaints += 1;
  });

  const districts = Object.entries(districtCounts)
    .map(([district, count]) => ({
      district,
      complaintCount: count,
    }))
    .sort((a, b) => b.complaintCount - a.complaintCount || a.district.localeCompare(b.district));

  return res.json({
    success: true,
    state: requestedState,
    totalDistricts: districts.length,
    totalComplaints: stateTotalComplaints,
    districts,
  });
});

// ── GET /api/authority/complaints/district-dockets ───────────────────────────
// Returns actual complaint records for selected state and district
router.get("/complaints/district-dockets", (req, res) => {
  const { state, district } = req.query;
  if (!state || !district) {
    return res.status(400).json({
      success: false,
      message: "Both 'state' and 'district' query parameters are required.",
    });
  }

  const requestedState = state.trim();
  const requestedDistrict = district.trim();
  const scope = getAuthorityScope(req);

  // Enforce server-side Authority scope
  if (
    scope.scopeState &&
    scope.scopeState.toLowerCase() !== requestedState.toLowerCase()
  ) {
    return res.status(403).json({
      success: false,
      message: `Access denied: Authority is restricted to ${scope.scopeState}.`,
    });
  }
  if (
    scope.scopeDistrict &&
    scope.scopeDistrict.toLowerCase() !== requestedDistrict.toLowerCase()
  ) {
    return res.status(403).json({
      success: false,
      message: `Access denied: Authority is restricted to district ${scope.scopeDistrict}.`,
    });
  }

  const complaints = getComplaints()
    .filter((c) => {
      const st = resolveComplaintState(c);
      const dt = resolveComplaintDistrict(c) || "Unspecified District";
      return (
        st?.toLowerCase() === requestedState.toLowerCase() &&
        dt.toLowerCase() === requestedDistrict.toLowerCase()
      );
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const records = complaints.map((c) => ({
    id: c.id,
    complaintId: c.complaint_id || c.id,
    productName: c.productName || "Packaged Commodity",
    brand: c.brand || "Not detected",
    location: c.location || c.location_address || `${requestedDistrict}, ${requestedState}`,
    district: c.district || requestedDistrict,
    state: c.state || requestedState,
    locality: c.locality || "—",
    pincode: c.pincode || "—",
    inspectorId: c.inspectorId || c.officerId || "Unassigned",
    inspectorName: c.inspectorName || c.officerName || "Pending Assignment",
    status: c.status || "SUBMITTED",
    createdAt: c.createdAt || c.submittedAt || null,
    issueCategory: c.issueCategory || "Labelling Discrepancy",
    officerDecision: c.officerDecision || null,
  }));

  return res.json({
    success: true,
    state: requestedState,
    district: requestedDistrict,
    totalComplaints: records.length,
    complaints: records,
  });
});

// ── GET /api/authority/geo/states ──────────────────────────────────────────
// Complete official Indian States and Union Territories list
router.get("/geo/states", (req, res) => {
  const scope = getAuthorityScope(req);
  let states = getAllStates();
  if (scope.scopeState) {
    states = states.filter(
      (s) => s.name.toLowerCase() === scope.scopeState.toLowerCase()
    );
  }
  return res.json({
    success: true,
    totalStates: states.length,
    states,
  });
});

// ── GET /api/authority/geo/districts ───────────────────────────────────────
// Complete official districts list for selected State/UT with genuine complaint counts
router.get("/geo/districts", (req, res) => {
  const { state } = req.query;
  if (!state || !state.trim()) {
    return res.status(400).json({
      success: false,
      message: "Query parameter 'state' is required.",
    });
  }

  const requestedState = state.trim();
  const scope = getAuthorityScope(req);

  // Enforce server-side Authority scope
  if (
    scope.scopeState &&
    scope.scopeState.toLowerCase() !== requestedState.toLowerCase()
  ) {
    return res.status(403).json({
      success: false,
      message: `Access denied: Authority is restricted to ${scope.scopeState}.`,
    });
  }

  let districts = getDistrictsForState(requestedState);
  if (scope.scopeDistrict) {
    districts = districts.filter(
      (d) => d.toLowerCase() === scope.scopeDistrict.toLowerCase()
    );
  }

  // Query genuine citizen complaints to map count per district
  const complaints = getComplaints().filter(
    (c) =>
      c.source === "consumer_complaint" &&
      resolveComplaintState(c)?.toLowerCase() === requestedState.toLowerCase()
  );

  const complaintCounts = {};
  complaints.forEach((c) => {
    const dt = resolveComplaintDistrict(c);
    if (dt) {
      complaintCounts[dt.toLowerCase()] = (complaintCounts[dt.toLowerCase()] || 0) + 1;
    }
  });

  const districtsWithCounts = districts.map((district) => ({
    district,
    complaintCount: complaintCounts[district.toLowerCase()] || 0,
  }));

  return res.json({
    success: true,
    state: requestedState,
    totalDistricts: districts.length,
    districts: districtsWithCounts,
  });
});

module.exports = router;

