/**
 * complaintsStore.js
 * -------------------
 * Legacy shim — kept for backward compatibility with components that
 * import these functions directly.
 *
 * All real complaint data now lives in the Express backend (in-memory store).
 * These functions delegate to the API service layer.
 *
 * Hard-coded seed data has been removed. The inspector dashboard and
 * inspection page now fetch from /api/complaints via the API.
 *
 * To fully remove this file in the future, migrate the remaining callers
 * (InspectorInspection.jsx, Home.jsx track-complaint modal) to the API.
 */

import { fetchComplaints, fetchComplaintById, updateComplaint } from './api';

/**
 * Get all complaints from the backend.
 * Returns a promise — callers must await.
 */
export const getComplaints = async () => {
  const data = await fetchComplaints();
  return data.complaints || [];
};

/**
 * Get a single complaint by ID from the backend.
 * Returns a promise — callers must await.
 */
export const getComplaintById = async (id) => {
  try {
    const data = await fetchComplaintById(id);
    return data.complaint || null;
  } catch {
    return null;
  }
};

/**
 * Update inspection result for a complaint.
 * Used by InspectorInspection.jsx.
 */
export const updateInspection = async (complaintId, inspectionData) => {
  const now = new Date().toISOString();
  const updates = {
    status: 'INSPECTION_COMPLETED',
    officerDecision: inspectionData.officerDecision,
    officerRemarks: inspectionData.officerRemarks || inspectionData.officerNotes || '',
    inspectorId: inspectionData.officerId || '',
    inspectorName: inspectionData.officerName || '',
    inspectedAt: now,
    inspectionDate: now,
  };

  const data = await updateComplaint(complaintId, updates);
  return data.complaint || null;
};
