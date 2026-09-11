import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, ShieldCheck, AlertTriangle, AlertCircle, 
  FileText, CheckCircle2, UploadCloud, Camera, 
  MapPin, Scale, X, Check, Clock, RefreshCw,
  Printer, Edit3, PlayCircle, Eye, Info, Package
} from 'lucide-react';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { fetchComplaintById, updateComplaint, scanProductImage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const FRESH_SLOTS_CONFIG = [
  { key: 'front', number: '1', label: 'Front Display Label' },
  { key: 'back', number: '2', label: 'Back / Information Panel' },
  { key: 'mrp', number: '3', label: 'MRP & Net Qty Panel' },
  { key: 'date', number: '4', label: 'Date & Batch Panel' },
];

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FIELD_DISPLAY_LABELS = {
  product_name: 'Product / Generic Name',
  manufacturer_or_packer: 'Manufacturer / Packer',
  net_quantity: 'Net Quantity',
  mrp: 'MRP',
  manufacturing_or_packing_date: 'Manufacturing / Packing Date',
  best_before_or_use_by: 'Best Before / Use By',
  consumer_care: 'Consumer Care',
  country_of_origin: 'Country of Origin',
};

const getFieldLabel = (fieldKey) => {
  if (!fieldKey) return '—';
  const keyStr = String(fieldKey).trim();
  const normalized = keyStr.toLowerCase().replace(/[\s\/-]+/g, '_');
  return FIELD_DISPLAY_LABELS[normalized] || FIELD_DISPLAY_LABELS[keyStr.toLowerCase()] || keyStr.replace(/_/g, ' ');
};


const InspectorInspection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Complaint & loading state
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Starting inspection state
  const [isStartingInspection, setIsStartingInspection] = useState(false);

  // Fresh Inspection Evidence (1–4 images)
  const [freshSlots, setFreshSlots] = useState({
    front: null,
    back: null,
    mrp: null,
    date: null,
  });

  const freshInputRefs = {
    front: useRef(null),
    back: useRef(null),
    mrp: useRef(null),
    date: useRef(null),
  };

  // Fresh AI Scan state
  const [isRunningAI, setIsRunningAI] = useState(false);
  const [aiError, setAiError] = useState('');
  const [freshAiResult, setFreshAiResult] = useState(null);
  const [aiRunTimestamp, setAiRunTimestamp] = useState(null);

  // Officer Decision state (Must be explicitly selected by officer)
  const [officerDecision, setOfficerDecision] = useState(''); // '' | 'COMPLIANT' | 'NON_COMPLIANT' | 'FURTHER_INVESTIGATION_REQUIRED'
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState('');
  const [isEditingAfterSubmit, setIsEditingAfterSubmit] = useState(false);

  // Load complaint data from backend
  const loadComplaint = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchComplaintById(id);
      if (data?.complaint) {
        const record = data.complaint;
        setComplaint(record);

        // Pre-fill officer decision & remarks if already inspected
        if (record.inspectionReport || record.status === 'INSPECTION_COMPLETED') {
          setOfficerDecision(record.inspectionReport?.officerDecision || record.officerDecision || '');
          setOfficerRemarks(record.inspectionReport?.officerRemarks || record.inspectionReport?.officerNotes || record.officerRemarks || '');
          setFreshAiResult(record.inspectionReport?.freshAiAnalysis || record.freshAiAnalysis || record.inspectionResult || null);
        } else if (record.status === 'INSPECTION_IN_PROGRESS') {
          if (record.officerRemarks) setOfficerRemarks(record.officerRemarks);
          if (record.officerDecision) setOfficerDecision(record.officerDecision);
          if (record.freshAiAnalysis) setFreshAiResult(record.freshAiAnalysis);
        }
      } else {
        setErrorMessage(`Complaint ${id} was not found in records.`);
      }
    } catch (err) {
      console.error('[InspectorInspection] Load error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to load complaint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaint();
  }, [id]);

  // ── Handler: Start Inspection ─────────────────────────────────────────────
  const handleStartInspection = async () => {
    setIsStartingInspection(true);
    setErrorMessage('');
    try {
      const response = await updateComplaint(complaint.id, {
        status: 'INSPECTION_IN_PROGRESS'
      });
      if (response?.complaint) {
        setComplaint(response.complaint);
      } else {
        setComplaint(prev => ({ ...prev, status: 'INSPECTION_IN_PROGRESS' }));
      }
    } catch (err) {
      console.error('[InspectorInspection] Start inspection error:', err);
      alert('Unable to update status: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsStartingInspection(false);
    }
  };

  // ── Handler: Fresh Evidence Upload ────────────────────────────────────────
  const handleSlotUpload = (slotKey, file) => {
    if (!file) return;
    const config = FRESH_SLOTS_CONFIG.find(s => s.key === slotKey);
    const newItem = {
      file,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      category: config.label,
    };
    setFreshSlots(prev => ({ ...prev, [slotKey]: newItem }));
    setAiError('');
  };

  const handleRemoveSlot = (slotKey) => {
    setFreshSlots(prev => ({ ...prev, [slotKey]: null }));
  };

  // ── Handler: Run Fresh AI Analysis via /api/scan ─────────────────────────
  const handleRunFreshAI = async () => {
    const activeSlots = Object.values(freshSlots).filter(Boolean);
    if (activeSlots.length === 0) {
      setAiError('Please upload at least one fresh evidence image (1–4 images allowed).');
      return;
    }

    setIsRunningAI(true);
    setAiError('');

    try {
      const filesToScan = [];
      for (const item of activeSlots) {
        if (item.file) {
          filesToScan.push(item.file);
        } else if (item.previewUrl) {
          try {
            const resp = await fetch(item.previewUrl);
            const blob = await resp.blob();
            filesToScan.push(new File([blob], item.name || 'inspector_evidence.jpg', { type: blob.type || 'image/jpeg' }));
          } catch (e) {
            console.warn('Could not read blob from preview:', e);
          }
        }
      }

      if (filesToScan.length === 0) {
        setAiError('No valid image files available to scan.');
        return;
      }

      // Send inspector images to the existing Express scan endpoint -> FastAPI
      const result = await scanProductImage(filesToScan);
      setFreshAiResult(result);
      setAiRunTimestamp(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // Separate operation: Save inspector evidence metadata + fresh AI analysis to complaint
      const evidenceMetadata = activeSlots.map((s) => ({
        name: s.name,
        category: s.category,
        previewUrl: s.previewUrl,
        size: s.size,
      }));

      try {
        const saveRes = await updateComplaint(complaint.id, {
          inspectorImages: evidenceMetadata,
          freshAiAnalysis: result,
          inspectionResult: result,
        });
        if (saveRes?.complaint) {
          setComplaint(saveRes.complaint);
        }
      } catch (persistErr) {
        console.warn('[InspectorInspection] Could not persist fresh AI metadata:', persistErr);
      }
    } catch (err) {
      console.error('[InspectorInspection] Fresh AI scan error:', err);
      setAiError(err.response?.data?.message || err.message || 'Fresh AI scan failed. Please check network/AI service.');
    } finally {
      setIsRunningAI(false);
    }
  };

  // ── Handler: Submit Final Officer Decision ─────────────────────────────────
  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    setDecisionError('');

    if (!officerDecision) {
      setDecisionError('Please explicitly select an Officer Decision before submitting.');
      return;
    }
    if (!officerRemarks.trim()) {
      setDecisionError('Please enter Officer Remarks explaining your findings and statutory basis.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const officerName = user?.name || sessionStorage.getItem('officer_name') || 'Authorized Inspector';
      const officerId = user?.id || sessionStorage.getItem('officer_id') || '';

      // Minimal decision payload — only fields necessary to update the decision
      const decisionPayload = {
        status: 'INSPECTION_COMPLETED',
        officerDecision,
        officerRemarks: officerRemarks.trim(),
        officerId,
        officerName,
        inspectionDate: now,
        inspectedAt: now,
      };

      const response = await updateComplaint(complaint.id, decisionPayload);
      if (response?.complaint) {
        setComplaint(response.complaint);
      } else {
        setComplaint(prev => ({
          ...prev,
          ...decisionPayload,
        }));
      }

      setIsEditingAfterSubmit(false);
      setSubmitSuccessMessage('Final Inspection Report filed in departmental registry. Status updated to INSPECTION_COMPLETED.');
    } catch (err) {
      console.error('[InspectorInspection] Submit decision error:', err);
      setDecisionError(err.response?.data?.message || err.message || 'Failed to submit final decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-500 font-mono flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-[#0f2942]" />
        <span>Loading inspection workspace and complaint record...</span>
      </div>
    );
  }

  // Error / Not Found State
  if (errorMessage || !complaint) {
    return (
      <div className="p-8 bg-white rounded-lg border border-slate-300 text-center max-w-md mx-auto my-12 shadow-xs">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">Inspection Docket Error</h2>
        <p className="text-xs text-slate-600 mt-1 mb-5">
          {errorMessage || `Docket ${id} could not be retrieved from the enforcement database.`}
        </p>
        <Button to="/official/inspector" variant="secondary" className="text-xs">
          Return to Inspector Queue
        </Button>
      </div>
    );
  }

  const isInspected = Boolean(complaint.inspectionReport || complaint.status === 'INSPECTION_COMPLETED');
  const citizenImgs = complaint.citizenImages?.length ? complaint.citizenImages : (complaint.images || []);
  const inspectorEvidenceList = complaint.inspectorImages?.length 
    ? complaint.inspectorImages 
    : (complaint.inspectionReport?.freshEvidence || Object.values(freshSlots).filter(Boolean));
  const finalFreshAi = complaint.freshAiAnalysis || complaint.inspectionReport?.freshAiAnalysis || complaint.inspectionResult || freshAiResult;
  const initialDeclarations = complaint.aiFindings?.declarations || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* ── TOP BREADCRUMB & DOCKET HEADER ── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <Link 
          to="/official/inspector" 
          className="inline-flex items-center text-xs font-bold text-[#0f2942] hover:text-[#183e63] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          <span>Back to Complaint Queue</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Docket</span>
          <span className="text-xs font-mono font-bold text-[#0f2942] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {complaint.id}
          </span>
          <StatusBadge status={complaint.status} size="small" />
        </div>
      </div>

      {/* ── SUCCESS NOTIFICATION BANNER ── */}
      {submitSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
            <span className="font-bold">{submitSuccessMessage}</span>
          </div>
          <Link
            to="/official/inspector"
            className="font-bold underline hover:text-emerald-950 whitespace-nowrap ml-3"
          >
            Return to Dashboard &rarr;
          </Link>
        </div>
      )}

      {/* ── CONDITIONAL RENDER: FINAL REPORT vs INTERACTIVE WORKSPACE ── */}
      {isInspected && !isEditingAfterSubmit ? (
        /* ================================================================= */
        /* 7. FINAL INSPECTION REPORT                                         */
        /* ================================================================= */
        <div className="space-y-6">
          <div className="bg-white rounded-lg border-2 border-[#0f2942] shadow-sm overflow-hidden">
            {/* Report Official Top Header */}
            <div className="px-6 py-5 bg-[#0f2942] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Government of Assam &bull; Legal Metrology Enforcement Directorate
                </div>
                <h1 className="text-xl font-black mt-1 text-white tracking-tight">
                  Final Inspection Report &bull; {complaint.id}
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  Notice / Filing Ref: <span className="font-mono text-amber-300">{complaint.inspectionReport?.noticeNumber || `LL/2026/REP-${complaint.id}`}</span>
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5">
                <StatusBadge status={complaint.status || 'INSPECTION_COMPLETED'} size="large" />
                <span className="text-[11px] text-slate-300 font-mono">
                  Inspection Date: {new Date(complaint.inspectionDate || complaint.inspectedAt || complaint.inspectionReport?.inspectedAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Officer Decision & Remarks Banner */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border border-slate-300 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Officer Decision
                </span>
                <StatusBadge status={complaint.officerDecision || complaint.inspectionReport?.officerDecision || 'NON_COMPLIANT'} size="large" />
                <p className="text-[11px] text-slate-500 mt-2">
                  Decision recorded by the authorized inspecting officer.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-slate-300 shadow-xs md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Officer Remarks & Statutory Grounds
                  </span>
                  <span className="text-[11px] font-mono text-slate-600 font-semibold">
                    Officer: {complaint.inspectorName || complaint.inspectionReport?.officerName || user?.name || sessionStorage.getItem('officer_name') || 'Authorized Inspector'}{complaint.inspectorId || complaint.inspectionReport?.officerId || user?.id || sessionStorage.getItem('officer_id') ? ` (${complaint.inspectorId || complaint.inspectionReport?.officerId || user?.id || sessionStorage.getItem('officer_id')})` : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded border border-slate-200 font-medium leading-relaxed">
                  {complaint.officerRemarks || complaint.inspectionReport?.officerRemarks || complaint.inspectionReport?.officerNotes || 'No remarks recorded.'}
                </p>
              </div>
            </div>

            {/* Product Information Section in Report */}
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#0f2942]" />
                Product Information
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Product Name</span>
                  <span className="font-bold text-slate-900">{complaint.productName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Manufacturer / Packer</span>
                  <span className="font-semibold text-slate-900">{complaint.extractedData?.manufacturer_or_packer || complaint.brand || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Net Quantity</span>
                  <span className="font-semibold text-slate-900">{complaint.extractedData?.net_quantity || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">MRP</span>
                  <span className="font-mono font-bold text-slate-900">{complaint.extractedData?.mrp || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Mfg / Packing Date</span>
                  <span className="font-semibold text-slate-900">{complaint.extractedData?.manufacturing_or_packing_date || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Best Before / Use By</span>
                  <span className="font-semibold text-slate-900">{complaint.extractedData?.best_before_or_use_by || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 sm:col-span-2">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">
                    Reported Issues (Citizen Allegations)
                  </span>
                  {complaint.reportedIssues && complaint.reportedIssues.length > 0 ? (
                    <div className="space-y-1">
                      <ul className="list-disc list-inside space-y-0.5 text-xs font-semibold text-slate-900">
                        {complaint.reportedIssues.map((iss, idx) => (
                          <li key={idx}>{iss}</li>
                        ))}
                      </ul>
                      {complaint.otherIssueDescription && (
                        <p className="text-[11px] text-slate-600 italic pl-1 pt-0.5">
                          Note: "{complaint.otherIssueDescription}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="font-semibold text-slate-900">{complaint.issueCategory || '—'}</span>
                  )}
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Inspection Premises</span>
                  <span className="font-semibold text-slate-900">{complaint.location || '—'}</span>
                </div>
              </div>
            </div>

            {/* Evidence Comparison: Citizen Evidence vs Fresh Inspector Evidence */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-200">
              {/* Citizen Evidence */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Citizen Evidence
                  </h4>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    Citizen Submission
                  </span>
                </div>
                {complaint.citizenDescription && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 italic">
                    "{complaint.citizenDescription}"
                  </p>
                )}
                {citizenImgs.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {citizenImgs.map((img, idx) => (
                      <div key={idx} className="bg-slate-50 rounded border border-slate-200 overflow-hidden text-center p-1.5">
                        <img 
                          src={img.previewUrl || img} 
                          alt={img.name || `Citizen evidence ${idx + 1}`} 
                          className="h-28 w-full object-contain mx-auto rounded bg-white" 
                        />
                        <span className="text-[10px] text-slate-600 font-semibold truncate block mt-1">
                          {img.category || img.name || `Citizen Image ${idx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 p-4 text-center bg-slate-50 rounded border border-slate-200">
                    No photographic evidence submitted by citizen.
                  </div>
                )}
              </div>

              {/* Inspector Evidence */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Fresh Inspector Evidence
                  </h4>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    On-Site Verification
                  </span>
                </div>
                {inspectorEvidenceList.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {inspectorEvidenceList.map((img, idx) => (
                      <div key={idx} className="bg-slate-50 rounded border border-slate-200 overflow-hidden text-center p-1.5">
                        <img 
                          src={img.previewUrl || img} 
                          alt={img.name || `Inspector evidence ${idx + 1}`} 
                          className="h-28 w-full object-contain mx-auto rounded bg-white" 
                        />
                        <span className="text-[10px] text-slate-600 font-semibold truncate block mt-1">
                          {img.category || img.name || `Inspector Image ${idx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 p-4 text-center bg-slate-50 rounded border border-slate-200">
                    No physical fresh evidence photographs captured.
                  </div>
                )}
              </div>
            </div>

            {/* AI Comparison: Initial AI Analysis vs Fresh AI Analysis */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-200">
              {/* Initial AI Analysis */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Initial AI Analysis
                  </h4>
                  <span className="text-[9px] font-bold uppercase text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    Preliminary AI Finding
                  </span>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
                  {initialDeclarations.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No preliminary AI findings recorded</div>
                  ) : (
                    initialDeclarations.map((d, i) => (
                      <div key={i} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-semibold text-slate-800 block">{d.field}</span>
                          {d.detectedText && <span className="text-[10px] font-mono text-slate-500">{d.detectedText}</span>}
                        </div>
                        <StatusBadge status={d.status} size="small" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Fresh AI Analysis */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Fresh Inspection AI Analysis
                  </h4>
                  <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Live OCR Scan
                  </span>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
                  {!finalFreshAi ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No fresh AI scan performed</div>
                  ) : (
                    (finalFreshAi.compliance?.findings || Object.entries(finalFreshAi.extracted || {}).map(([k, v]) => ({
                      field: getFieldLabel(k),
                      status: v ? 'PASS' : 'REVIEW',
                      detectedText: String(v || 'Not detected')
                    }))).map((d, i) => (
                      <div key={i} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-semibold text-slate-800 block">{getFieldLabel(d.field)}</span>
                          {d.detectedText && <span className="text-[10px] font-mono text-slate-500">{d.detectedText}</span>}
                        </div>
                        <StatusBadge status={d.status} size="small" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Official docket filed in the National Legal Metrology Registry.
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center text-xs font-semibold px-4 py-2 bg-white text-slate-700 rounded border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Official Report
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAfterSubmit(true)}
                  className="inline-flex items-center text-xs font-semibold px-4 py-2 bg-white text-slate-700 rounded border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  Amend Decision
                </button>
                <Button to="/official/inspector" variant="primary" className="text-xs px-5 py-2 font-bold bg-[#0f2942]">
                  Return to Queue
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================================================================= */
        /* INTERACTIVE INSPECTION WORKFLOW (SECTIONS 1 TO 6)                */
        /* ================================================================= */
        <div className="space-y-6">
          {/* Statutory Separation Disclaimer Banner */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">AI Finding vs Officer Decision: </span>
              AI analysis is preliminary and should not be treated as a final legal determination. The Officer Decision is the decision recorded by the inspecting officer.
            </div>
          </div>

          {/* ── 3. START INSPECTION ACTION BANNER ── */}
          {complaint.status === 'SUBMITTED' || complaint.status === 'PENDING' || complaint.status === 'UNDER_REVIEW' ? (
            <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                    Step 1: Initiate Official Inspection
                  </h3>
                </div>
                <p className="text-xs text-indigo-800 mt-1">
                  Docket is currently in <strong>{complaint.status}</strong> status. Click below to transition docket to <strong>INSPECTION_IN_PROGRESS</strong> before recording evidence.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={handleStartInspection}
                disabled={isStartingInspection}
                className="text-xs px-5 py-2 font-bold bg-[#0f2942] hover:bg-[#183e63] shadow-xs whitespace-nowrap"
              >
                {isStartingInspection ? (
                  <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Starting Inspection...</>
                ) : (
                  <><PlayCircle className="w-4 h-4 mr-1.5" />Start Inspection</>
                )}
              </Button>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Investigation is active: <strong className="text-slate-900 font-mono">{complaint.status}</strong>. Review evidence and record your final decision below.
                </span>
              </div>
              <StatusBadge status={complaint.status} size="small" />
            </div>
          )}

          {/* ── 1. COMPLAINT INFORMATION ── */}
          <section className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0f2942]" />
                Complaint Information
              </h2>
              <StatusBadge status={complaint.status} size="small" />
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Complaint ID</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{complaint.id}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Submission Date</span>
                <span className="font-mono text-slate-700">
                  {new Date(complaint.createdAt || complaint.submittedAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Citizen-Reported Issues</span>
                <div className="mt-0.5 space-y-1">
                  {(complaint.reportedIssues && complaint.reportedIssues.length > 0
                    ? complaint.reportedIssues
                    : [complaint.issueCategory || 'Other']
                  ).map((iss, idx) => (
                    <span
                      key={idx}
                      className="block font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]"
                    >
                      {iss}
                    </span>
                  ))}
                  {complaint.otherIssueDescription && (
                    <span className="block text-[10px] text-slate-500 italic pl-1">
                      Note: "{complaint.otherIssueDescription}"
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Location</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{complaint.location || 'Not specified'}</span>
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Current Status</span>
                <div className="mt-0.5">
                  <StatusBadge status={complaint.status} size="small" />
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Complainant Reference</span>
                <span className="text-slate-700 font-medium">
                  {complaint.citizenName || 'Citizen User'} ({complaint.citizenContact || 'Verified'})
                </span>
              </div>

              <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-100">
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Citizen Description</span>
                <p className="text-slate-800 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200 font-medium">
                  {complaint.citizenDescription || 'No detailed citizen description provided.'}
                </p>
              </div>
            </div>
          </section>

          {/* ── 2. PRODUCT INFORMATION ── */}
          <section className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0f2942]" />
                Product Information
              </h2>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Product Name</span>
                <span className="font-bold text-slate-900 text-sm">{complaint.productName}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Manufacturer / Packer</span>
                <span className="font-semibold text-slate-800">{complaint.extractedData?.manufacturer_or_packer || complaint.brand || '—'}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Net Quantity</span>
                <span className="font-semibold text-slate-800">{complaint.extractedData?.net_quantity || '—'}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">MRP</span>
                <span className="font-mono font-bold text-slate-900">{complaint.extractedData?.mrp || '—'}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Manufacturing / Packing Date</span>
                <span className="font-semibold text-slate-800">{complaint.extractedData?.manufacturing_or_packing_date || '—'}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Best Before / Use By</span>
                <span className="font-semibold text-slate-800">{complaint.extractedData?.best_before_or_use_by || '—'}</span>
              </div>
            </div>
          </section>

          {/* ── 3. CITIZEN EVIDENCE ── */}
          <section className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Citizen Evidence
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Actual photographs uploaded by the citizen during grievance submission
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                Citizen Submission
              </span>
            </div>

            <div className="p-5">
              {citizenImgs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {citizenImgs.map((img, idx) => {
                    const label = img.category || (
                      idx === 0 ? 'Front Label' : idx === 1 ? 'Back Label' : idx === 2 ? 'MRP Panel' : 'Date Panel'
                    );

                    return (
                      <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex flex-col">
                        <div className="px-2.5 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-800 uppercase tracking-wider flex justify-between items-center">
                          <span>{label}</span>
                          <span className="text-[9px] text-slate-500 font-mono">#{idx + 1}</span>
                        </div>
                        <div className="h-36 p-2 flex items-center justify-center bg-white">
                          <img 
                            src={img.previewUrl || img} 
                            alt={img.name || `Citizen image ${idx + 1}`} 
                            className="max-h-full max-w-full object-contain rounded"
                          />
                        </div>
                        <div className="p-2 text-[10px] text-slate-500 truncate border-t border-slate-100 bg-slate-50">
                          {img.name || `Evidence photo ${idx + 1}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded border border-slate-200">
                  No photographic evidence submitted by citizen.
                </div>
              )}
            </div>
          </section>

          {/* ── 4. INITIAL AI ANALYSIS ── */}
          <section className="bg-white rounded-lg border border-amber-300 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-amber-50/70 border-b border-amber-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Initial AI Analysis
                </h2>
                <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                  Preliminary AI Finding
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1">
                Automated computer vision findings from the citizen's scan. These findings highlight <em>Potential Non-Compliance</em> or areas that <em>Require Review</em>. They do <strong>NOT</strong> constitute a confirmed legal violation.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {initialDeclarations.length === 0 ? (
                <div className="px-5 py-5 text-xs text-slate-500 text-center">
                  No preliminary AI findings recorded for this docket.
                </div>
              ) : (
                initialDeclarations.map((d, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{getFieldLabel(d.field)}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {d.detectedText || d.notes || '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={d.status} size="small" />
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {d.status === 'PASS' ? 'Compliant' : d.status === 'POTENTIAL NON-COMPLIANCE' ? 'Potential Non-Compliance' : 'Requires Review'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ── 5. FRESH INSPECTION EVIDENCE ── */}
          <section className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#0f2942]" />
                  Fresh Inspection Evidence
                </h2>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Upload newly captured images of the product/label for inspection (1–4 images allowed). These will not overwrite citizen images.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* 4 Labelled Upload Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {FRESH_SLOTS_CONFIG.map((slotConfig) => {
                  const item = freshSlots[slotConfig.key];

                  return (
                    <div 
                      key={slotConfig.key}
                      className={`rounded-lg border-2 transition-all flex flex-col overflow-hidden ${
                        item ? 'border-slate-300 bg-white' : 'border-dashed border-slate-300 bg-slate-50/70 hover:border-slate-400'
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="px-2.5 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800">
                          {slotConfig.number}. {slotConfig.label}
                        </span>
                        {item && (
                          <span className="text-[9px] font-bold text-emerald-700 uppercase bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Fresh
                          </span>
                        )}
                      </div>

                      {/* Slot Body */}
                      {item ? (
                        <div className="p-2 flex flex-col flex-1">
                          <div className="h-32 bg-white rounded border border-slate-200 flex items-center justify-center p-1 mb-2">
                            <img src={item.previewUrl} alt={item.name} className="max-h-full max-w-full object-contain rounded" />
                          </div>
                          <div className="text-[10px] text-slate-600 truncate mb-2">
                            {item.name} ({formatSize(item.size)})
                          </div>
                          <div className="flex gap-1 mt-auto">
                            <button
                              type="button"
                              onClick={() => freshInputRefs[slotConfig.key].current?.click()}
                              className="flex-1 py-1 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded border border-slate-300"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(slotConfig.key)}
                              className="flex-1 py-1 px-1 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-[10px] font-semibold rounded border border-slate-300"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            ref={freshInputRefs[slotConfig.key]}
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleSlotUpload(slotConfig.key, e.target.files[0]);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div 
                          onClick={() => freshInputRefs[slotConfig.key].current?.click()}
                          className="p-6 flex flex-col items-center justify-center flex-1 cursor-pointer hover:bg-slate-100/50 transition-colors text-center"
                        >
                          <Camera className="w-6 h-6 text-slate-400 mb-1.5" />
                          <span className="text-xs font-semibold text-slate-700">
                            Upload Photo
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {slotConfig.label}
                          </span>
                          <input
                            ref={freshInputRefs[slotConfig.key]}
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleSlotUpload(slotConfig.key, e.target.files[0]);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Error Message if Any */}
              {aiError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Action Button: Run Fresh Analysis */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {aiRunTimestamp
                    ? `Fresh AI analysis completed at ${aiRunTimestamp}`
                    : 'Upload fresh inspection photos above, then click to run fresh AI analysis through the scan pipeline.'}
                </span>

                <Button
                  type="button"
                  variant="primary"
                  onClick={handleRunFreshAI}
                  disabled={isRunningAI}
                  className="text-xs px-5 py-2 font-bold bg-[#0f2942] hover:bg-[#183e63] shadow-xs"
                >
                  {isRunningAI ? (
                    <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running Fresh Analysis...</>
                  ) : (
                    <><Camera className="w-3.5 h-3.5 mr-1.5" />Run Fresh Analysis</>
                  )}
                </Button>
              </div>
            </div>
          </section>

          {/* ── 6. FRESH INSPECTION AI ANALYSIS ── */}
          <section className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Fresh Inspection AI Analysis
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  OCR extraction and rule compliance findings from newly captured inspector evidence
                </p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                freshAiResult
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {freshAiResult ? 'Analysis Complete' : 'Awaiting Fresh Analysis'}
              </span>
            </div>

            {isRunningAI ? (
              <div className="p-8 text-center text-xs text-slate-600 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#0f2942]" />
                <span className="font-semibold">Processing fresh images through OCR and compliance pipeline...</span>
                <span className="text-[11px] text-slate-400">Extracting Rule 6 declarations and validating against Legal Metrology Rules, 2011</span>
              </div>
            ) : freshAiResult ? (
              <div className="divide-y divide-slate-100">
                {/* Findings List */}
                {(freshAiResult.compliance?.findings || Object.entries(freshAiResult.extracted || {}).map(([k, v]) => ({
                  field: getFieldLabel(k),
                  status: v ? 'PASS' : 'REVIEW',
                  detectedText: String(v || 'Not detected')
                }))).map((d, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{getFieldLabel(d.field)}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{d.detectedText || d.message || '—'}</div>
                    </div>
                    <StatusBadge status={d.status} size="small" />
                  </div>
                ))}

                {/* Extracted Fields Summary Table */}
                {freshAiResult.extracted && (
                  <div className="p-5 bg-slate-50/50 border-t border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                      Extracted Declaration Fields
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(freshAiResult.extracted)
                        .filter(([, v]) => v !== null && v !== undefined && v !== '')
                        .map(([key, val]) => (
                          <div key={key} className="p-2 bg-white rounded border border-slate-200 flex justify-between items-center">
                            <span className="text-slate-600">{getFieldLabel(key)}:</span>
                            <span className="font-mono font-bold text-slate-800 text-right truncate max-w-[200px]">{String(val)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-5 py-6 text-center text-xs text-slate-500">
                Upload fresh images in Section "Fresh Inspection Evidence" above and click "Run Fresh Analysis" to display live findings.
              </div>
            )}
          </section>

          {/* ── 7. OFFICER DECISION ── */}
          <section className="bg-white rounded-lg border-2 border-[#0f2942] shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-[#0f2942] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                    OFFICER DECISION
                  </h2>
                  <span className="text-[11px] text-slate-300">
                    Decision recorded by the inspecting officer
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
                Officer Decision
              </span>
            </div>

            <form onSubmit={handleSubmitDecision} className="p-5 space-y-5">
              {/* Radio options: Compliant, Non-Compliant, Further Investigation Required */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">
                  Select Officer Decision <span className="text-red-600">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'COMPLIANT', title: 'Compliant', desc: 'All mandatory declarations verified and physically present.' },
                    { id: 'NON_COMPLIANT', title: 'Non-Compliant', desc: 'Breach of Rule 6 or price alteration identified during physical inspection.' },
                    { id: 'FURTHER_INVESTIGATION_REQUIRED', title: 'Further Investigation Required', desc: 'Batch/premises inspection inconclusive; manufacturer summons required.' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        officerDecision === opt.id
                          ? 'bg-blue-50/50 border-[#0f2942] ring-1 ring-[#0f2942]'
                          : 'bg-white border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="officerDecisionOption"
                          value={opt.id}
                          checked={officerDecision === opt.id}
                          onChange={(e) => {
                            setOfficerDecision(e.target.value);
                            setDecisionError('');
                          }}
                          className="mt-0.5 text-[#0f2942] focus:ring-[#0f2942]"
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-900">{opt.title}</div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Officer Remarks Textarea */}
              <div>
                <label htmlFor="officer-remarks" className="block text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">
                  Officer Remarks <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="officer-remarks"
                  rows={4}
                  required
                  value={officerRemarks}
                  onChange={(e) => {
                    setOfficerRemarks(e.target.value);
                    setDecisionError('');
                  }}
                  placeholder="Enter detailed inspection findings, physical checks on packaging print indelibility, retailer explanation, and statutory grounds..."
                  className="w-full text-xs p-3 border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-slate-800"
                />
              </div>

              {/* Validation error if any */}
              {decisionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{decisionError}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Submitting will file the Final Inspection Report and update complaint status to INSPECTION_COMPLETED.
                </span>

                <div className="flex gap-2 w-full sm:w-auto">
                  {isEditingAfterSubmit && (
                    <Button 
                      type="button" 
                      onClick={() => setIsEditingAfterSubmit(false)} 
                      variant="secondary" 
                      className="w-full sm:w-auto text-xs"
                    >
                      Cancel Editing
                    </Button>
                  )}
                  <Button to="/official/inspector" variant="secondary" className="w-full sm:w-auto text-xs">
                    Back to Queue
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold bg-[#0f2942] hover:bg-[#183e63] shadow-xs"
                  >
                    {isSubmitting ? (
                      <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Submitting Final Decision...</>
                    ) : (
                      'Submit Final Decision'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default InspectorInspection;
