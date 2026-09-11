import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronRight, ArrowLeft, RefreshCw, AlertCircle, 
  MapPin, Building, FileText, CheckCircle2, User, Clock 
} from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { 
  fetchComplaintsByState, 
  fetchComplaintsByDistrict, 
  fetchDistrictComplaints 
} from '../../services/api';

/**
 * StateWiseComplaints
 * -------------------
 * Allows Authority to explore citizen complaints:
 * 1. State-wise (aggregated complaint count)
 * 2. District-wise (drill-down by state)
 * 3. District complaint dockets list (actual database records)
 *
 * Real database records only; separate from confirmed violation concepts.
 */
const StateWiseComplaints = ({ user, onResetToDashboard }) => {
  // Navigation states
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  // Data states (database records only)
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [complaintsList, setComplaintsList] = useState([]);

  // Telemetry counts
  const [totalScopedComplaints, setTotalScopedComplaints] = useState(0);

  // Loading & error states
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [error, setError] = useState('');

  // ── 1. Load State-wise Complaints ──────────────────────────────────────────
  const loadStates = useCallback(async () => {
    setLoadingStates(true);
    setError('');
    try {
      const data = await fetchComplaintsByState(user?.stateScope || null);
      if (data && data.success) {
        setStatesList(data.states || []);
        setTotalScopedComplaints(data.totalComplaints || 0);
      } else {
        setStatesList([]);
      }
    } catch (err) {
      setError('Unable to load state-wise complaints from database.');
      setStatesList([]);
    } finally {
      setLoadingStates(false);
    }
  }, [user?.stateScope]);

  useEffect(() => {
    loadStates();
  }, [loadStates]);

  // ── 2. Load District-wise Complaints for Selected State ─────────────────────
  const loadDistricts = useCallback(async (stateName) => {
    if (!stateName) return;
    setLoadingDistricts(true);
    setError('');
    try {
      const data = await fetchComplaintsByDistrict(stateName, user?.districtScope || null);
      if (data && data.success) {
        setDistrictsList(data.districts || []);
      } else {
        setDistrictsList([]);
      }
    } catch (err) {
      setError(`Unable to load district-wise complaints for ${stateName}.`);
      setDistrictsList([]);
    } finally {
      setLoadingDistricts(false);
    }
  }, [user?.districtScope]);

  // ── 3. Load Complaints for Selected District ───────────────────────────────
  const loadComplaints = useCallback(async (stateName, districtName) => {
    if (!stateName || !districtName) return;
    setLoadingComplaints(true);
    setError('');
    try {
      const data = await fetchDistrictComplaints(stateName, districtName);
      if (data && data.success) {
        setComplaintsList(data.complaints || []);
      } else {
        setComplaintsList([]);
      }
    } catch (err) {
      setError(`Unable to load complaints for ${districtName}, ${stateName}.`);
      setComplaintsList([]);
    } finally {
      setLoadingComplaints(false);
    }
  }, []);

  // ── Navigation Handlers ───────────────────────────────────────────────────
  const handleSelectState = (stateName) => {
    setSelectedState(stateName);
    setSelectedDistrict(null);
    setComplaintsList([]);
    loadDistricts(stateName);
  };

  const handleSelectDistrict = (districtName) => {
    setSelectedDistrict(districtName);
    loadComplaints(selectedState, districtName);
  };

  const handleBackToStates = () => {
    setSelectedState(null);
    setSelectedDistrict(null);
    setDistrictsList([]);
    setComplaintsList([]);
    loadStates();
  };

  const handleBackToDistricts = () => {
    setSelectedDistrict(null);
    setComplaintsList([]);
    if (selectedState) {
      loadDistricts(selectedState);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Breadcrumb Navigation ── */}
      <nav aria-label="Breadcrumb" className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 shadow-xs flex items-center justify-between">
        <ol className="flex items-center flex-wrap gap-1 text-xs font-semibold text-slate-600">
          <li>
            <button
              onClick={() => {
                if (onResetToDashboard) {
                  onResetToDashboard();
                } else {
                  handleBackToStates();
                }
              }}
              className="hover:text-[#0f2942] transition-colors cursor-pointer text-slate-500 hover:underline"
            >
              Authority Dashboard
            </button>
          </li>
          <li>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 inline" />
          </li>
          <li>
            <button
              onClick={handleBackToStates}
              className={`hover:text-[#0f2942] transition-colors cursor-pointer ${
                !selectedState ? 'text-[#0f2942] font-bold' : 'text-slate-500 hover:underline'
              }`}
            >
              State-wise Complaints
            </button>
          </li>

          {selectedState && (
            <>
              <li>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 inline" />
              </li>
              <li>
                <button
                  onClick={handleBackToDistricts}
                  className={`hover:text-[#0f2942] transition-colors cursor-pointer ${
                    !selectedDistrict ? 'text-[#0f2942] font-bold' : 'text-slate-500 hover:underline'
                  }`}
                >
                  {selectedState}
                </button>
              </li>
            </>
          )}

          {selectedDistrict && (
            <>
              <li>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 inline" />
              </li>
              <li className="text-[#0f2942] font-bold">
                {selectedDistrict}
              </li>
            </>
          )}
        </ol>

        {/* Back button if drilled down */}
        {selectedDistrict ? (
          <button
            onClick={handleBackToDistricts}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f2942] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Districts</span>
          </button>
        ) : selectedState ? (
          <button
            onClick={handleBackToStates}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f2942] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to States</span>
          </button>
        ) : (
          <button
            onClick={loadStates}
            disabled={loadingStates}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Refresh state counts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStates ? 'animate-spin text-[#0f2942]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </nav>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LEVEL 1: State-wise Complaints View                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!selectedState && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-base font-bold text-[#0f2942] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0f2942]" />
                Complaints by State
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time citizen complaint volume aggregated by state jurisdiction (Database verified)
              </p>
            </div>
            {totalScopedComplaints > 0 && (
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#0f2942]/10 text-[#0f2942] border border-[#0f2942]/20">
                {totalScopedComplaints} Total Complaint{totalScopedComplaints === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="p-5">
            {loadingStates ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0f2942]" />
                <span>Aggregating complaints by state...</span>
              </div>
            ) : statesList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No complaints available.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {statesList.map((item) => (
                  <div
                    key={item.state}
                    onClick={() => handleSelectState(item.state)}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-[#0f2942] group-hover:text-white transition-colors">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 group-hover:text-[#0f2942] transition-colors">
                          {item.state}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Click to view district-wise breakdown
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-mono text-base font-extrabold text-slate-900 group-hover:text-[#0f2942]">
                          {item.complaintCount}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Complaint{item.complaintCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0f2942] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LEVEL 2: District-wise Complaints for Selected State                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {selectedState && !selectedDistrict && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <span>State Scope:</span>
                <span className="text-[#0f2942] font-extrabold">{selectedState}</span>
              </div>
              <h2 className="text-base font-bold text-[#0f2942]">
                District-wise Complaints — {selectedState}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a district below to inspect corresponding citizen complaint dockets
              </p>
            </div>

            <button
              onClick={handleBackToStates}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All States</span>
            </button>
          </div>

          <div className="p-5">
            {loadingDistricts ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0f2942]" />
                <span>Loading districts for {selectedState}...</span>
              </div>
            ) : districtsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No complaints available for {selectedState}.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {districtsList.map((item) => (
                  <div
                    key={item.district}
                    onClick={() => handleSelectDistrict(item.district)}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-[#0f2942] group-hover:text-white transition-colors">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 group-hover:text-[#0f2942] transition-colors">
                          {item.district}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Click to inspect complaint records in this district
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-mono text-base font-extrabold text-slate-900 group-hover:text-[#0f2942]">
                          {item.complaintCount}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Complaint{item.complaintCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0f2942] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LEVEL 3: Complaint List / Table for Selected District                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {selectedState && selectedDistrict && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                <span>{selectedState}</span>
                <span>&bull;</span>
                <span className="text-[#0f2942] font-extrabold">{selectedDistrict} District</span>
              </div>
              <h2 className="text-base font-bold text-[#0f2942]">
                Complaints in {selectedDistrict}, {selectedState}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed record of citizen complaints lodged within this jurisdiction
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-200 text-slate-800">
                {complaintsList.length} Record{complaintsList.length === 1 ? '' : 's'}
              </span>
              <button
                onClick={handleBackToDistricts}
                className="inline-flex items-center gap-1 px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Districts</span>
              </button>
            </div>
          </div>

          <div className="p-0">
            {loadingComplaints ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0f2942]" />
                <span>Loading complaints for {selectedDistrict}...</span>
              </div>
            ) : complaintsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No complaints available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Complaint ID</th>
                      <th className="py-3 px-4">Product / Commodity</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">District</th>
                      <th className="py-3 px-4">Assigned Inspector</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {complaintsList.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {c.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 max-w-xs truncate">
                            {c.productName}
                          </div>
                          {c.brand && c.brand !== 'Not detected' && (
                            <div className="text-[10px] text-slate-500 truncate">{c.brand}</div>
                          )}
                          <div className="text-[10px] text-slate-500">{c.issueCategory}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs">
                          <div className="truncate font-medium">{c.location}</div>
                          {c.locality && c.locality !== '—' && (
                            <div className="text-[10px] text-slate-500">{c.locality}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">
                          {c.district}
                        </td>
                        <td className="py-3 px-4 text-slate-800 whitespace-nowrap">
                          <div className="font-medium flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{c.inspectorName || 'Unassigned'}</span>
                          </div>
                          {c.inspectorId && c.inspectorId !== 'Unassigned' && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              ID: {c.inspectorId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge status={c.status} size="small" />
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatDate(c.createdAt)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StateWiseComplaints;
