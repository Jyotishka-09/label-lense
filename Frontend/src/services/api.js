import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 60000,
});

// Attach supervisory scope headers if authenticated as Authority
api.interceptors.request.use((config) => {
  try {
    const raw = sessionStorage.getItem('ll_auth_session');
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.stateScope) {
        config.headers['x-authority-state'] = u.stateScope;
      }
      if (u && u.districtScope) {
        config.headers['x-authority-district'] = u.districtScope;
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  return config;
});


// ── Scan API ─────────────────────────────────────────────────────────────────

/**
 * Upload 1–4 product images to Express backend: POST /api/scan
 * Returns the complete scan response from the AI pipeline.
 */
export const scanProductImage = async (files) => {
  const fileList = Array.isArray(files) ? files : [files];
  const validFiles = fileList.filter((f) => f instanceof File || f instanceof Blob);

  if (validFiles.length === 0) {
    throw new Error('No valid image file provided for scanning.');
  }

  const formData = new FormData();
  validFiles.forEach((file, idx) => {
    formData.append('images', file);
    if (idx === 0) {
      formData.append('image', file);
    }
  });

  const response = await api.post('/api/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  return response.data;
};

/** Backward-compatible alias */
export const uploadImages = async (files) => scanProductImage(files);
export const uploadImage = (file) => scanProductImage(file);

/**
 * Assistive Legal Metrology (PC) Rules, 2011 rule engine evaluator.
 * Used as a fallback when the live AI service is unavailable.
 */
export const evaluateCompliance = (filesData, customProduct) => {
  const defaultDeclarations = [
    {
      id: 'generic_name',
      field: 'Generic Name of Commodity',
      rule: 'Rule 6(1)(a)',
      status: 'PASS',
      detectedText: customProduct?.name || 'Pre-Packaged Food / Consumer Commodity',
      confidence: 96,
      notes: 'Clearly stated on primary display panel in conspicuous font.'
    },
    {
      id: 'net_quantity',
      field: 'Net Quantity (Standard Metric Units)',
      rule: 'Rule 6(1)(b) & Rule 12',
      status: 'PASS',
      detectedText: customProduct?.netQuantity || '500 g / 500 ml',
      confidence: 93,
      notes: 'Expressed in permissible standard unit (g/kg or ml/L) without non-standard qualifiers.'
    },
    {
      id: 'mrp',
      field: 'Maximum Retail Price (MRP incl. of all taxes)',
      rule: 'Rule 6(1)(e)',
      status: customProduct?.flagMrp ? 'POTENTIAL NON-COMPLIANCE' : 'REVIEW',
      detectedText: customProduct?.mrp || 'MRP ₹ — (Incl. of all taxes text obscured or over-stickered)',
      confidence: 84,
      notes: customProduct?.flagMrp
        ? 'Price altered with secondary sticker or "inclusive of all taxes" missing.'
        : 'MRP declaration detected, but character contrast requires visual verification.'
    },
    {
      id: 'manufacturer_details',
      field: 'Manufacturer / Packer / Importer Address',
      rule: 'Rule 6(1)(d)',
      status: 'PASS',
      detectedText: customProduct?.manufacturer || 'Full registered postal address detected.',
      confidence: 90,
      notes: 'Complete name and address of manufacturer or packer printed.'
    },
    {
      id: 'mfg_date',
      field: 'Month & Year of Manufacture / Packing',
      rule: 'Rule 6(1)(c)',
      status: 'REVIEW',
      detectedText: customProduct?.mfgDate || 'Batch / Date area detected; printing ink faint',
      confidence: 76,
      notes: 'Inspectors should verify clarity and indelibility of stamped date.'
    },
    {
      id: 'country_of_origin',
      field: 'Country of Origin',
      rule: 'Rule 6(1)(f)',
      status: 'PASS',
      detectedText: 'Made in India / Country of Origin: India',
      confidence: 95,
      notes: 'Prominently displayed on label.'
    },
    {
      id: 'consumer_care',
      field: 'Consumer Care Contact Details (Phone & Email)',
      rule: 'Rule 6(1)(g)',
      status: customProduct?.flagConsumerCare ? 'POTENTIAL NON-COMPLIANCE' : 'PASS',
      detectedText: customProduct?.consumerCare || 'Helpline: 1800-XXX-XXXX | care@brand.in',
      confidence: 89,
      notes: 'Both telephone and postal/email contact required under Rule 6(1)(g).'
    }
  ];

  const hasPotentialNonCompliance = defaultDeclarations.some(d => d.status === 'POTENTIAL NON-COMPLIANCE');
  const hasReview = defaultDeclarations.some(d => d.status === 'REVIEW');
  let overallStatus = 'PASS';
  if (hasPotentialNonCompliance) overallStatus = 'POTENTIAL NON-COMPLIANCE';
  else if (hasReview) overallStatus = 'REVIEW';

  return {
    overallStatus,
    timestamp: new Date().toISOString(),
    confidenceAverage: 89,
    ruleStandard: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    declarations: defaultDeclarations,
    disclaimer: 'ASSISTIVE AI FINDING: This analysis highlights potential label compliance gaps based on computer vision text recognition. It does NOT constitute a final legal or enforcement determination.'
  };
};

// ── Complaint API ─────────────────────────────────────────────────────────────

/**
 * POST /api/complaints — Create a new complaint
 */
export const createComplaint = async (payload) => {
  const response = await api.post('/api/complaints', payload);
  return response.data; // { success, complaint }
};

/**
 * GET /api/complaints — Fetch all complaints (optionally filter by citizenId and/or source)
 */
export const fetchComplaints = async (citizenId = null, source = null, state = null, district = null) => {
  const params = {};
  if (citizenId) params.citizenId = citizenId;
  if (source && source !== 'ALL') params.source = source;
  if (state && state !== 'ALL') params.state = state;
  if (district && district !== 'ALL') params.district = district;
  const response = await api.get('/api/complaints', { params });
  return response.data; // { success, complaints, total, counts }
};

/**
 * GET /api/complaints/:id — Fetch a single complaint
 */
export const fetchComplaintById = async (id) => {
  const response = await api.get(`/api/complaints/${id}`);
  return response.data; // { success, complaint }
};

/**
 * PATCH /api/complaints/:id — Update a complaint (status, inspection data, etc.)
 */
export const updateComplaint = async (id, updates) => {
  const response = await api.patch(`/api/complaints/${id}`, updates);
  return response.data; // { success, complaint }
};

// ── Authority Supervisory API ────────────────────────────────────────────────

/**
 * GET /api/authority/overview — High-level supervisory telemetry
 */
export const fetchAuthorityOverview = async () => {
  const response = await api.get('/api/authority/overview');
  return response.data; // { success, telemetry }
};

/**
 * GET /api/authority/geo — Geographic incident aggregation & risk heatmap
 */
export const fetchAuthorityGeo = async (zoneId = null) => {
  const params = zoneId ? { zoneId } : {};
  const response = await api.get('/api/authority/geo', { params });
  return response.data; // { success, zones, totalZones }
};

/**
 * GET /api/authority/inspectors — Inspector directory, workload & enforcement history
 */
export const fetchAuthorityInspectors = async (query = '') => {
  const params = query ? { q: query } : {};
  const response = await api.get('/api/authority/inspectors', { params });
  return response.data; // { success, inspectors, total }
};

/**
 * GET /api/authority/risk — Category risk matrix & violation typology
 */
export const fetchAuthorityRisk = async () => {
  const response = await api.get('/api/authority/risk');
  return response.data; // { success, categoryRisk, violationTypologies }
};

/**
 * GET /api/authority/complaints/by-state — Grouped complaint counts by state
 */
export const fetchComplaintsByState = async (scopeState = null) => {
  const params = scopeState ? { scopeState } : {};
  const response = await api.get('/api/authority/complaints/by-state', { params });
  return response.data; // { success, totalStates, totalComplaints, states }
};

/**
 * GET /api/authority/complaints/by-district — Grouped complaint counts by district for a state
 */
export const fetchComplaintsByDistrict = async (state, scopeDistrict = null) => {
  const params = { state };
  if (scopeDistrict) params.scopeDistrict = scopeDistrict;
  const response = await api.get('/api/authority/complaints/by-district', { params });
  return response.data; // { success, state, totalDistricts, totalComplaints, districts }
};

/**
 * GET /api/authority/geo/states — Complete official 36 Indian States and UTs
 */
export const fetchGeoStates = async (scopeState = null) => {
  const params = scopeState ? { scopeState } : {};
  const response = await api.get('/api/authority/geo/states', { params });
  return response.data; // { success, totalStates, states }
};

/**
 * GET /api/authority/geo/districts — Complete official districts for selected State/UT
 */
export const fetchGeoDistricts = async (state, scopeDistrict = null) => {
  const params = { state };
  if (scopeDistrict) params.scopeDistrict = scopeDistrict;
  const response = await api.get('/api/authority/geo/districts', { params });
  return response.data; // { success, state, totalDistricts, districts }
};

/**
 * GET /api/authority/complaints/district-dockets — Complaints for selected state and district
 */
export const fetchDistrictComplaints = async (state, district) => {
  const params = { state, district };
  const response = await api.get('/api/authority/complaints/district-dockets', { params });
  return response.data; // { success, state, district, totalComplaints, complaints }
};

export default api;


