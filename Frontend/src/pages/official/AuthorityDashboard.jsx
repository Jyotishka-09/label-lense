import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, AlertCircle, Shield, ClipboardList, Flame, 
  User, BarChart3, Filter, Search, CheckCircle2, 
  AlertTriangle, Layers, MapPin, Eye, ChevronRight 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import GeoHeatmap from '../../components/authority/GeoHeatmap';
import InspectorDirectory from '../../components/authority/InspectorDirectory';
import RiskMatrix from '../../components/authority/RiskMatrix';
import StateWiseComplaints from '../../components/authority/StateWiseComplaints';
import { 
  fetchAuthorityOverview, 
  fetchAuthorityGeo, 
  fetchAuthorityInspectors, 
  fetchAuthorityRisk, 
  fetchComplaints,
  fetchGeoStates,
  fetchGeoDistricts,
} from '../../services/api';
import { getAllStates, getDistrictsForState, findState } from '../../data/indiaGeoMaster';


const AuthorityDashboard = () => {
  const { user } = useAuth();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('dockets'); // 'dockets' | 'heatmap' | 'inspectors' | 'risk'

  // Data states
  const [telemetry, setTelemetry] = useState({
    total: 0,
    pending: 0,
    underInspection: 0,
    completed: 0,
    operationalQueue: 0,
    authorityAssigned: 0,
    consumerComplaints: 0,
    compliant: 0,
    nonCompliant: 0,
    complianceRate: 100,
    violationRate: 0,
  });
  const [complaints, setComplaints] = useState([]);
  const [geoData, setGeoData] = useState({ zones: [] });
  const [inspectorsData, setInspectorsData] = useState({ inspectors: [] });
  const [riskData, setRiskData] = useState({ categoryRisk: [], violationTypologies: [], totalRecordsEvaluated: 0 });

  // Filtering states for Supervisory Dockets table
  const [docketSearch, setDocketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [selectedDocket, setSelectedDocket] = useState(null);

  // Geographic State & District dropdown filter states
  const [availableStates, setAvailableStates] = useState([]);
  const [stateFilter, setStateFilter] = useState('ALL');
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [districtFilter, setDistrictFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Authoritative Administrative Master Data: All 36 Indian States and UTs
      const allStates = getAllStates();
      if (user?.stateScope) {
        const scoped = findState(user.stateScope);
        setAvailableStates(scoped ? [scoped] : allStates);
      } else {
        setAvailableStates(allStates);
      }

      // 2. Query database for overview, geo, inspectors, risk, and GENUINE CITIZEN COMPLAINTS ONLY
      const [overviewRes, geoRes, inspRes, riskRes, compRes] = await Promise.allSettled([
        fetchAuthorityOverview(),
        fetchAuthorityGeo(),
        fetchAuthorityInspectors(),
        fetchAuthorityRisk(),
        fetchComplaints(null, 'consumer_complaint', null, null),
      ]);

      if (overviewRes.status === 'fulfilled' && overviewRes.value.telemetry) {
        setTelemetry(overviewRes.value.telemetry);
      }
      if (geoRes.status === 'fulfilled' && geoRes.value.zones) {
        setGeoData(geoRes.value);
      }
      if (inspRes.status === 'fulfilled' && inspRes.value.inspectors) {
        setInspectorsData(inspRes.value);
      }
      if (riskRes.status === 'fulfilled') {
        setRiskData(riskRes.value);
      }
      if (compRes.status === 'fulfilled' && compRes.value.complaints) {
        // Enforce genuine citizen complaints only (exclude any dummy/authority tasks)
        const genuineOnly = compRes.value.complaints.filter(
          (c) => !c.source || c.source === 'consumer_complaint'
        );
        setComplaints(genuineOnly);
      }
    } catch (err) {
      setError('Error communicating with supervisory telemetry services. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [user?.stateScope]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // When state filter changes, load complete official districts and query database for genuine citizen complaints
  const handleStateFilterChange = async (newState) => {
    setStateFilter(newState);
    setDistrictFilter('ALL');
    setLoading(true);
    try {
      if (newState === 'ALL') {
        setAvailableDistricts([]);
      } else {
        // Complete official districts for selected State/UT
        const districts = getDistrictsForState(newState);
        setAvailableDistricts(districts);
      }

      // Backend database query for genuine citizen complaints
      const compRes = await fetchComplaints(
        null,
        'consumer_complaint',
        newState === 'ALL' ? null : newState,
        null
      );
      if (compRes && compRes.success && Array.isArray(compRes.complaints)) {
        const genuineOnly = compRes.complaints.filter(
          (c) => !c.source || c.source === 'consumer_complaint'
        );
        setComplaints(genuineOnly);
      }
    } catch (err) {
      console.error('Error filtering complaints by state:', err);
    } finally {
      setLoading(false);
    }
  };

  // When district filter changes, query database for genuine citizen complaints
  const handleDistrictFilterChange = async (newDistrict) => {
    setDistrictFilter(newDistrict);
    setLoading(true);
    try {
      // Backend database query for genuine citizen complaints
      const compRes = await fetchComplaints(
        null,
        'consumer_complaint',
        stateFilter === 'ALL' ? null : stateFilter,
        newDistrict === 'ALL' ? null : newDistrict
      );
      if (compRes && compRes.success && Array.isArray(compRes.complaints)) {
        const genuineOnly = compRes.complaints.filter(
          (c) => !c.source || c.source === 'consumer_complaint'
        );
        setComplaints(genuineOnly);
      }
    } catch (err) {
      console.error('Error filtering complaints by district:', err);
    } finally {
      setLoading(false);
    }
  };

  // Render complaint location or 'Location Unverified' if unverified
  const renderComplaintLocation = (c) => {
    const hasState = Boolean(c.state && c.state.trim());
    const hasDistrict = Boolean(c.district && c.district.trim());
    const hasLocality = Boolean(c.locality && c.locality.trim());

    if (hasState || hasDistrict) {
      return (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900 flex items-start gap-1">
            <span className="text-slate-400">📍</span>
            <span className="truncate max-w-[200px]">
              {c.locality || c.location || '—'}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 font-medium pl-4">
            {c.district ? `${c.district}, ` : ''}{c.state || ''}
          </div>
          {c.pincode && (
            <div className="text-[10px] text-slate-400 font-mono pl-4">
              PIN: {c.pincode}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-0.5">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Location Unverified
        </span>
      </div>
    );
  };

  // Filtered complaints: ONLY genuine citizen complaints (State + District + Search + Status)
  const filteredComplaints = complaints.filter((c) => {
    // Only genuine consumer complaints
    if (c.source && c.source !== 'consumer_complaint') return false;

    const q = docketSearch.toLowerCase().trim();
    const matchQuery = !q || (
      (c.id && c.id.toLowerCase().includes(q)) ||
      (c.productName && c.productName.toLowerCase().includes(q)) ||
      (c.brand && c.brand.toLowerCase().includes(q)) ||
      (c.pincode && String(c.pincode).includes(q)) ||
      (c.locality && c.locality.toLowerCase().includes(q)) ||
      (c.location && c.location.toLowerCase().includes(q))
    );

    const matchStatus = statusFilter === 'ALL' || (
      statusFilter === 'OPEN'
        ? (c.status === 'SUBMITTED' || c.status === 'PENDING' || c.status === 'UNDER_REVIEW' || c.status === 'INSPECTION_IN_PROGRESS')
        : statusFilter === 'COMPLETED'
        ? (c.status === 'INSPECTION_COMPLETED' || c.status === 'CLOSED')
        : c.status === statusFilter
    );

    const cState = (c.state || '').trim().toLowerCase();
    const cLoc = (c.location || '').toLowerCase();
    const matchState = stateFilter === 'ALL' || (
      cState ? cState === stateFilter.trim().toLowerCase() : cLoc.includes(stateFilter.trim().toLowerCase())
    );

    const cDistrict = (c.district || '').trim().toLowerCase();
    const matchDistrict = districtFilter === 'ALL' || (
      cDistrict ? cDistrict === districtFilter.trim().toLowerCase() : cLoc.includes(districtFilter.trim().toLowerCase())
    );

    return matchQuery && matchStatus && matchState && matchDistrict;
  });


  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 pt-2">
      {/* ── Dashboard Header ── */}
      <div className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#0f2942]" />
            Legal Metrology Directorate &bull; Supervisory Command Headquarters
          </div>
          <h1 className="text-2xl font-black text-[#0f2942] tracking-tight">
            Authority Portal &amp; Enforcement Intelligence
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Supervisory oversight of packaged commodity compliance dockets, regional risk patterns, and field inspector deployment.
          </p>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0f2942]' : ''}`} />
          <span>Refresh All Telemetry</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 4 Supervisory Telemetry KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Dockets */}
        <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Total Dockets Logged
            </span>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {loading ? '—' : telemetry.total}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-2 mt-2 flex justify-between">
            <span>Statewide Master Registry</span>
            <span className="font-semibold text-slate-700">{complaints.length} Records</span>
          </div>
        </div>

        {/* Card 2: Open Operational Queue */}
        <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Open Operational Queue
            </span>
            <div className="text-2xl font-extrabold font-mono text-amber-700">
              {loading ? '—' : telemetry.operationalQueue}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-2 mt-2 flex justify-between">
            <span>Pending: {telemetry.pending}</span>
            <span className="text-indigo-700 font-semibold">Active: {telemetry.underInspection}</span>
          </div>
        </div>

        {/* Card 3: Source Distribution */}
        <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Proactive vs Citizen Sources
            </span>
            <div className="text-2xl font-extrabold font-mono text-[#0f2942]">
              {loading ? '—' : `${telemetry.authorityAssigned} / ${telemetry.consumerComplaints}`}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-2 mt-2 flex justify-between">
            <span>Drives: {telemetry.authorityAssigned}</span>
            <span>Citizen: {telemetry.consumerComplaints}</span>
          </div>
        </div>

        {/* Card 4: Compliance Health */}
        <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Compliance Resolution Health
            </span>
            <div className="text-2xl font-extrabold font-mono text-emerald-700">
              {loading ? '—' : `${telemetry.complianceRate}%`}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-2 mt-2 flex justify-between">
            <span className="text-emerald-700 font-semibold">Passed: {telemetry.compliant}</span>
            <span className="text-rose-700 font-semibold">Violations: {telemetry.nonCompliant}</span>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="bg-white rounded-lg border border-slate-300 p-1.5 shadow-xs flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab('dockets')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'dockets'
              ? 'bg-[#0f2942] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Citizen Complaints</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
            activeTab === 'dockets' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {complaints.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('statewise')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'statewise'
              ? 'bg-[#0f2942] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Complaints by State</span>
        </button>

        <button
          onClick={() => setActiveTab('heatmap')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'heatmap'
              ? 'bg-[#0f2942] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span>Geographic Risk Heatmap</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
            activeTab === 'heatmap' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {geoData.zones?.length || 0} Zones
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inspectors')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'inspectors'
              ? 'bg-[#0f2942] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Field Inspector Directory</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
            activeTab === 'inspectors' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {inspectorsData.inspectors?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('risk')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'risk'
              ? 'bg-[#0f2942] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Commodity Risk Matrix</span>
        </button>
      </div>

      {/* ── Tab Content: Citizen Complaints ── */}
      {activeTab === 'dockets' && (
        <div className="space-y-4">
          {/* Citizen Complaints Filter Card */}
          <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-[#0f2942]" />
                Citizen Complaints
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Official Administrative Registry (36 States &amp; UTs)
              </span>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="flex flex-wrap items-center gap-4">
                {/* State Dropdown */}
                <div className="flex items-center gap-2">
                  <label htmlFor="state-filter-select" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0f2942]" />
                    <span>State</span>
                  </label>
                  <select
                    id="state-filter-select"
                    value={stateFilter}
                    onChange={(e) => handleStateFilterChange(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-[#0f2942] outline-none font-semibold text-slate-800 cursor-pointer max-w-[220px]"
                  >
                    <option value="ALL">All States &amp; UTs ({availableStates.length})</option>
                    <optgroup label={`States (${availableStates.filter((s) => s.type === 'State').length})`}>
                      {availableStates
                        .filter((s) => s.type === 'State')
                        .map((st) => (
                          <option key={st.code || st.name} value={st.name}>
                            {st.name} ({st.code})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label={`Union Territories (${availableStates.filter((s) => s.type === 'Union Territory').length})`}>
                      {availableStates
                        .filter((s) => s.type === 'Union Territory')
                        .map((st) => (
                          <option key={st.code || st.name} value={st.name}>
                            {st.name} ({st.code})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                {/* District Dropdown */}
                <div className="flex items-center gap-2">
                  <label htmlFor="district-filter-select" className="text-xs font-bold text-slate-700">
                    District
                  </label>
                  <select
                    id="district-filter-select"
                    value={districtFilter}
                    onChange={(e) => handleDistrictFilterChange(e.target.value)}
                    disabled={stateFilter === 'ALL'}
                    className={`text-xs border border-slate-300 rounded px-2.5 py-1.5 outline-none font-semibold text-slate-800 max-w-[220px] ${
                      stateFilter === 'ALL'
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#0f2942] cursor-pointer'
                    }`}
                  >
                    <option value="ALL">
                      {stateFilter === 'ALL' ? 'All Districts' : `All Districts (${availableDistricts.length})`}
                    </option>
                    {availableDistricts.map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))}
                  </select>
                </div>

                {(stateFilter !== 'ALL' || districtFilter !== 'ALL') && (
                  <button
                    onClick={() => handleStateFilterChange('ALL')}
                    className="text-[11px] text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Search Box */}
              <div className="relative flex-1 max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={docketSearch}
                  onChange={(e) => setDocketSearch(e.target.value)}
                  placeholder="Filter by complaint ID, product, brand, pincode..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-[#0f2942] outline-none text-slate-800"
                />
              </div>
            </div>

            {/* Showing Count Line */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Showing {filteredComplaints.length} genuine citizen complaint{filteredComplaints.length === 1 ? '' : 's'}</span>
              </span>
              {stateFilter !== 'ALL' && (
                <span className="text-[11px] font-mono text-slate-500">
                  Scope: {stateFilter}{districtFilter !== 'ALL' ? ` &bull; ${districtFilter}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Complaints Table */}
          <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-[#0f2942]" />
                Citizen Complaints Master Table
              </h2>
              <span className="text-[11px] font-mono text-slate-500">
                Showing {filteredComplaints.length} genuine citizen complaint{filteredComplaints.length === 1 ? '' : 's'}
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0f2942]" />
                <span>Loading citizen complaints from enforcement database...</span>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <ClipboardList className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700 text-sm">
                  {stateFilter !== 'ALL' && districtFilter !== 'ALL'
                    ? 'No citizen complaints found for this district.'
                    : stateFilter !== 'ALL'
                    ? 'No citizen complaints found for this state.'
                    : 'No citizen complaints found.'}
                </p>
                <p className="text-slate-400">
                  {stateFilter !== 'ALL' || districtFilter !== 'ALL' || docketSearch || statusFilter !== 'ALL'
                    ? 'No genuine citizen complaints match the active filter criteria.'
                    : 'The state supervisory registry contains zero citizen complaints.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Complaint ID</th>
                      <th className="py-3 px-4">Product &amp; Commodity</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Assigned Inspector</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredComplaints.map((c) => {
                      const isExpanded = selectedDocket?.id === c.id;

                      return (
                        <React.Fragment key={c.id}>
                          <tr 
                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                              isExpanded ? 'bg-slate-100/60 font-medium' : ''
                            }`}
                            onClick={() => setSelectedDocket(isExpanded ? null : c)}
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                              <div>{c.id}</div>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border mt-0.5 bg-sky-50 text-sky-800 border-sky-200">
                                Citizen Complaint
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900">{c.productName}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                {c.brand && <span>{c.brand}</span>}
                                {c.category && <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-[10px]">{c.category}</span>}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">
                              {renderComplaintLocation(c)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {c.inspectorId ? (
                                <div>
                                  <div className="font-bold text-[#0f2942] text-xs">
                                    {c.inspectorName || 'Enforcement Officer'}
                                  </div>
                                  <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                    {c.inspectorId}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  Assignment Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <StatusBadge status={c.status} size="small" />
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                              {new Date(c.createdAt || c.submittedAt || Date.now()).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDocket(isExpanded ? null : c);
                                }}
                                className="text-xs font-semibold text-[#0f2942] hover:underline cursor-pointer"
                              >
                                {isExpanded ? 'Hide Details' : 'Details &rarr;'}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Docket Details Drawer */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-4 bg-slate-50 border-y border-slate-200">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                        Supervisory Docket Dossier: {c.id}
                                      </h4>
                                      <p className="text-[11px] text-slate-500">
                                        Lodged on {new Date(c.createdAt || c.submittedAt).toLocaleString('en-IN')}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => setSelectedDocket(null)}
                                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                                    >
                                      Close &times;
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    <div className="p-3 bg-white rounded border border-slate-200 space-y-1.5">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Commodity &amp; Issue</span>
                                      <div className="font-semibold text-slate-800">{c.productName}</div>
                                      <div className="text-slate-600">Category: {c.category || 'Packaged Commodity'}</div>
                                      <div className="pt-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Reported Issues (Citizen Allegations):</span>
                                        <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                          {(c.reportedIssues && c.reportedIssues.length > 0
                                            ? c.reportedIssues
                                            : [c.issueCategory || 'General Rule Non-Compliance']
                                          ).map((iss, idx) => (
                                            <li key={idx} className="font-medium text-slate-800 text-xs">
                                              {iss}
                                            </li>
                                          ))}
                                        </ul>
                                        {c.otherIssueDescription && (
                                          <div className="text-slate-500 text-[11px] italic mt-1 pl-2">
                                            Note: "{c.otherIssueDescription}"
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Location &amp; Jurisdiction</span>
                                      <div className="font-semibold text-slate-900 flex items-start gap-1">
                                        <span>📍</span>
                                        <span>{c.location || c.location_address || '—'}</span>
                                      </div>
                                      <div className="text-slate-600">
                                        District: <span className="font-medium text-slate-800">{c.district || 'Kamrup Metro'}</span> &bull; State: {c.state || 'Assam'}
                                      </div>
                                      {c.latitude != null && (
                                        <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between pt-1">
                                          <span>{Number(c.latitude).toFixed(4)}° N, {Number(c.longitude).toFixed(4)}° E</span>
                                          <a
                                            href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#0f2942] hover:underline font-bold"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            View Map &rarr;
                                          </a>
                                        </div>
                                      )}
                                    </div>

                                    <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Enforcement Assignment</span>
                                      <div className="text-slate-700">
                                        Officer: <span className="font-semibold text-slate-900">{c.inspectorName || 'Unassigned (Pending Allocation)'}</span>
                                      </div>
                                      <div className="text-slate-600">Badge/Code: <span className="font-mono">{c.inspectorId || 'N/A'}</span></div>
                                      <div className="text-slate-600 text-[11px] italic">
                                        Status: {c.assignmentStatus || (c.inspectorId ? 'ASSIGNED' : 'Inspector Assignment Pending')}
                                      </div>
                                      {c.assignmentReason && (
                                        <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-1 mt-1">
                                          {c.assignmentReason}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Content: Complaints by State & District ── */}
      {activeTab === 'statewise' && (
        <StateWiseComplaints 
          user={user} 
          onResetToDashboard={() => setActiveTab('dockets')} 
        />
      )}

      {/* ── Tab Content: Geographic Risk Heatmap ── */}
      {activeTab === 'heatmap' && (
        <GeoHeatmap 
          zones={geoData.zones} 
          loading={loading} 
          onRefresh={loadAllData} 
        />
      )}

      {/* ── Tab Content: Field Inspector Directory ── */}
      {activeTab === 'inspectors' && (
        <InspectorDirectory 
          inspectors={inspectorsData.inspectors} 
          loading={loading} 
        />
      )}

      {/* ── Tab Content: Commodity Risk Matrix ── */}
      {activeTab === 'risk' && (
        <RiskMatrix 
          riskData={riskData} 
          loading={loading} 
          onRefresh={loadAllData} 
        />
      )}
    </div>
  );
};

export default AuthorityDashboard;
