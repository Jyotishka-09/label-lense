import React, { useState, useMemo, useEffect } from 'react';
import { 
  MapPin, AlertCircle, RefreshCw, CheckCircle2, 
  Search, ChevronRight, Layers, Eye, Filter, ArrowRight, ShieldCheck, Clock, CheckCircle
} from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { getAllStates, getDistrictsForState, findState } from '../../data/indiaGeoMaster';
import { fetchComplaints } from '../../services/api';

/**
 * GeoHeatmap — Geographic Complaint Overview
 * --------------------------------------------
 * A clean, government-style geographic complaint distribution console.
 * Automatic cascading filter: State -> District -> Area / Locality.
 * No "View Complaints" button — every filter selection triggers automatic update.
 *
 * Complaint != Violation:
 * Accurately displays genuine citizen reports without conflating them
 * with confirmed legal non-compliance.
 */
const GeoHeatmap = ({ complaints: initialComplaints = [], user, loading = false, onRefresh }) => {
  // Master complaints pool (stores all complaints for computing available areas across selections)
  const [masterComplaints, setMasterComplaints] = useState(initialComplaints);

  // Scoped complaints returned for the current selection
  const [scopedComplaints, setScopedComplaints] = useState(initialComplaints);

  // Loading & error states
  const [isUpdating, setIsUpdating] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Geographic filter states (default to user's stateScope if available, else 'ALL')
  const defaultState = user?.stateScope || 'ALL';
  const [selectedState, setSelectedState] = useState(defaultState);
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedArea, setSelectedArea] = useState('ALL');

  // Keep masterComplaints in sync when parent passes new initialComplaints
  useEffect(() => {
    if (initialComplaints && initialComplaints.length > 0) {
      setMasterComplaints(initialComplaints);
      if (selectedState === defaultState && selectedDistrict === 'ALL' && selectedArea === 'ALL') {
        setScopedComplaints(initialComplaints);
        setFetchError('');
      }
    }
  }, [initialComplaints, defaultState, selectedState, selectedDistrict, selectedArea]);

  // Automatic data update whenever State, District, or Area changes
  useEffect(() => {
    let isMounted = true;
    setIsUpdating(true);
    setFetchError('');

    fetchComplaints(null, 'consumer_complaint', selectedState, selectedDistrict, selectedArea)
      .then((res) => {
        if (isMounted && res && Array.isArray(res.complaints)) {
          const genuineOnly = res.complaints.filter(
            (c) => !c.source || c.source === 'consumer_complaint'
          );
          setScopedComplaints(genuineOnly);

          // If at national scope, also update the master pool
          if (selectedState === 'ALL') {
            setMasterComplaints(genuineOnly);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error loading complaint data in GeoHeatmap:', err);
          setFetchError('Unable to load complaint data.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsUpdating(false);
        }
      });

    return () => {
      isMounted = false;
      setIsUpdating(false);
    };
  }, [selectedState, selectedDistrict, selectedArea]);

  // Authoritative States list (from master dataset)
  const statesList = useMemo(() => {
    const all = getAllStates();
    if (user?.stateScope) {
      const scoped = findState(user.stateScope);
      return scoped ? [scoped] : all;
    }
    return all;
  }, [user?.stateScope]);

  // Available Districts for selected state (from master dataset)
  const availableDistricts = useMemo(() => {
    if (!selectedState || selectedState === 'ALL') return [];
    return getDistrictsForState(selectedState);
  }, [selectedState]);

  // Available Areas / Localities: strictly dependent on selected geographic scope
  // If State = All States, returns empty array (no cross-state area list is shown)
  const availableAreas = useMemo(() => {
    if (!selectedState || selectedState === 'ALL') {
      return [];
    }

    const pool = masterComplaints.length > 0 ? masterComplaints : (initialComplaints.length > 0 ? initialComplaints : scopedComplaints);
    const areasSet = new Set();
    pool.forEach((c) => {
      if (c.source && c.source !== 'consumer_complaint') return;

      // Must match selected state
      const cState = (c.state || '').trim().toLowerCase();
      if (cState !== selectedState.trim().toLowerCase()) return;

      // Must match selected district if not ALL
      if (selectedDistrict !== 'ALL') {
        const cDistrict = (c.district || '').trim().toLowerCase();
        if (cDistrict !== selectedDistrict.trim().toLowerCase()) return;
      }

      const loc = (c.locality || c.location || '').trim();
      if (loc && loc !== '—' && loc !== 'Unknown') {
        areasSet.add(loc);
      }
    });

    return Array.from(areasSet).sort((a, b) => a.localeCompare(b));
  }, [masterComplaints, initialComplaints, scopedComplaints, selectedState, selectedDistrict]);

  // Cascading Filter Handlers (Immediate Automatic Update)
  const handleStateChange = (e) => {
    const newState = e.target.value;
    setSelectedState(newState);
    setSelectedDistrict('ALL');
    setSelectedArea('ALL');
  };

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    setSelectedDistrict(newDistrict);
    setSelectedArea('ALL');
  };

  const handleAreaChange = (e) => {
    const newArea = e.target.value;
    setSelectedArea(newArea);
  };

  const handleResetFilters = () => {
    setSelectedState(defaultState);
    setSelectedDistrict('ALL');
    setSelectedArea('ALL');
  };

  const handleRetry = () => {
    setIsUpdating(true);
    setFetchError('');
    fetchComplaints(null, 'consumer_complaint', selectedState, selectedDistrict, selectedArea)
      .then((res) => {
        if (res && Array.isArray(res.complaints)) {
          const genuineOnly = res.complaints.filter(
            (c) => !c.source || c.source === 'consumer_complaint'
          );
          setScopedComplaints(genuineOnly);
          if (selectedState === 'ALL') setMasterComplaints(genuineOnly);
        }
      })
      .catch((err) => {
        console.error('Error retrying complaint data load:', err);
        setFetchError('Unable to load complaint data.');
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  // Filter complaints based on the current selection
  const filteredComplaints = useMemo(() => {
    return scopedComplaints.filter((c) => {
      // Genuine citizen complaints only
      if (c.source && c.source !== 'consumer_complaint') return false;

      const cState = (c.state || '').trim().toLowerCase();
      const cLoc = (c.location || '').toLowerCase();
      const matchState = selectedState === 'ALL' || (
        cState ? cState === selectedState.trim().toLowerCase() : cLoc.includes(selectedState.trim().toLowerCase())
      );

      const cDistrict = (c.district || '').trim().toLowerCase();
      const matchDistrict = selectedDistrict === 'ALL' || (
        cDistrict ? cDistrict === selectedDistrict.trim().toLowerCase() : cLoc.includes(selectedDistrict.trim().toLowerCase())
      );

      const cLocality = (c.locality || c.location || '').trim().toLowerCase();
      const matchArea = selectedArea === 'ALL' || (
        cLocality.includes(selectedArea.trim().toLowerCase())
      );

      return matchState && matchDistrict && matchArea;
    });
  }, [scopedComplaints, selectedState, selectedDistrict, selectedArea]);

  // Breakdown for Map / Visual Concentration Display
  // 1. If Area is selected -> locality overview metrics
  // 2. If District is selected -> breakdown by Areas in that district
  // 3. If State is selected -> breakdown by all official districts in that state
  // 4. If State is ALL -> breakdown across all 36 Indian states/UTs
  const concentrationData = useMemo(() => {
    if (selectedArea !== 'ALL') {
      return [];
    }

    if (selectedDistrict !== 'ALL') {
      // Breakdown by Area / Locality within district
      const areaMap = {};
      filteredComplaints.forEach((c) => {
        const area = (c.locality || c.location || 'Unspecified Locality').trim();
        areaMap[area] = (areaMap[area] || 0) + 1;
      });

      return Object.entries(areaMap)
        .map(([name, count]) => ({ name, count, type: 'area' }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }

    if (selectedState !== 'ALL') {
      // Breakdown by District for the state (includes all official districts in state)
      const stateDistricts = getDistrictsForState(selectedState);
      const districtCounts = {};

      // Initialize all official districts with 0
      stateDistricts.forEach((d) => {
        districtCounts[d] = 0;
      });

      // Count genuine citizen complaints per district
      filteredComplaints.forEach((c) => {
        const d = (c.district || '').trim();
        if (d && districtCounts[d] !== undefined) {
          districtCounts[d] += 1;
        } else if (d) {
          districtCounts[d] = (districtCounts[d] || 0) + 1;
        }
      });

      return Object.entries(districtCounts)
        .map(([name, count]) => ({ name, count, type: 'district' }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }

    // Breakdown across all states
    const stateMap = {};
    statesList.forEach((st) => {
      stateMap[st.name] = 0;
    });

    filteredComplaints.forEach((c) => {
      const st = (c.state || '').trim();
      if (st && stateMap[st] !== undefined) {
        stateMap[st] += 1;
      }
    });

    return Object.entries(stateMap)
      .map(([name, count]) => ({ name, count, type: 'state' }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [filteredComplaints, selectedState, selectedDistrict, selectedArea, statesList]);

  // Top Areas ranking by complaints count (or issue breakdown if Area selected)
  const topAreasRanking = useMemo(() => {
    if (selectedArea !== 'ALL') {
      // When specific locality selected: breakdown of reported issues in that locality
      const issueMap = {};
      filteredComplaints.forEach((c) => {
        const issue = c.issueCategory || c.reportedIssues?.[0] || 'General Non-Compliance';
        issueMap[issue] = (issueMap[issue] || 0) + 1;
      });

      return Object.entries(issueMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    if (selectedDistrict !== 'ALL') {
      // Ranked areas within the selected district
      const areaMap = {};
      filteredComplaints.forEach((c) => {
        const loc = (c.locality || c.location || 'Unknown').trim();
        areaMap[loc] = (areaMap[loc] || 0) + 1;
      });

      return Object.entries(areaMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 5);
    }

    if (selectedState !== 'ALL') {
      // Ranked areas across the selected state
      const areaMap = {};
      filteredComplaints.forEach((c) => {
        let label = (c.locality || c.district || 'Unknown').trim();
        if (c.district && c.locality && c.district !== c.locality) {
          label = `${c.locality} (${c.district})`;
        }
        areaMap[label] = (areaMap[label] || 0) + 1;
      });

      return Object.entries(areaMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 5);
    }

    // Ranked areas across India
    const areaMap = {};
    filteredComplaints.forEach((c) => {
      let label = (c.locality || c.district || 'Unknown').trim();
      if (c.district && c.locality && c.district !== c.locality) {
        label = `${c.locality} (${c.district})`;
      } else if (c.district) {
        label = `${c.district}, ${c.state || ''}`;
      }
      areaMap[label] = (areaMap[label] || 0) + 1;
    });

    return Object.entries(areaMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [filteredComplaints, selectedState, selectedDistrict, selectedArea]);

  // Intensity color helper based on genuine complaint count
  const getIntensityStyle = (count) => {
    if (count === 0) {
      return {
        cardBg: 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 text-slate-600',
        badgeBg: 'bg-slate-100 text-slate-500 border border-slate-200',
        dot: 'bg-slate-300',
        label: 'No complaints',
      };
    }
    if (count === 1) {
      return {
        cardBg: 'bg-emerald-50/80 hover:bg-emerald-100/70 border-emerald-300 text-emerald-950',
        badgeBg: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
        dot: 'bg-emerald-500',
        label: 'Low',
      };
    }
    if (count >= 2 && count <= 3) {
      return {
        cardBg: 'bg-amber-50/90 hover:bg-amber-100/80 border-amber-300 text-amber-950',
        badgeBg: 'bg-amber-200 text-amber-900 border border-amber-400 font-bold',
        dot: 'bg-amber-500',
        label: 'Moderate',
      };
    }
    return {
      cardBg: 'bg-rose-50/90 hover:bg-rose-100/80 border-rose-300 text-rose-950 font-medium',
      badgeBg: 'bg-rose-200 text-rose-900 border border-rose-400 font-black',
      dot: 'bg-rose-600',
      label: 'High',
    };
  };

  // Section Main Heading (Section 12 specification)
  const mapTitle = useMemo(() => {
    if (selectedArea !== 'ALL') {
      return `${selectedArea} - Complaint Overview`;
    }
    if (selectedDistrict !== 'ALL') {
      return `${selectedDistrict} - Complaints by Area`;
    }
    if (selectedState !== 'ALL') {
      return `${selectedState} - Complaints by District`;
    }
    return 'India - Complaints by State';
  }, [selectedState, selectedDistrict, selectedArea]);

  // Top Areas Card Heading (Section 13 specification)
  const topAreasTitle = useMemo(() => {
    if (selectedArea !== 'ALL') {
      return `${selectedArea} - Locality Breakdown`;
    }
    if (selectedDistrict !== 'ALL') {
      return `Top Areas in ${selectedDistrict} by Complaints`;
    }
    if (selectedState !== 'ALL') {
      return `Top Areas in ${selectedState} by Complaints`;
    }
    return 'Top Areas by Complaints';
  }, [selectedState, selectedDistrict, selectedArea]);

  // Active Scope Breadcrumb Text (Section 7 & 15 specification)
  const activeScopeText = useMemo(() => {
    if (selectedState === 'ALL') {
      return 'All States (India)';
    }
    if (selectedDistrict === 'ALL') {
      return `${selectedState} (India)`;
    }
    if (selectedArea === 'ALL') {
      return `${selectedState} → ${selectedDistrict} → All Areas`;
    }
    return `${selectedState} → ${selectedDistrict} → ${selectedArea}`;
  }, [selectedState, selectedDistrict, selectedArea]);

  // Click on a tile in the grid to drill down automatically
  const handleItemClick = (item) => {
    if (item.type === 'state') {
      setSelectedState(item.name);
      setSelectedDistrict('ALL');
      setSelectedArea('ALL');
    } else if (item.type === 'district') {
      setSelectedDistrict(item.name);
      setSelectedArea('ALL');
    } else if (item.type === 'area') {
      setSelectedArea(item.name);
    }
  };

  // Initial loading only while parent or component has zero data on mount
  const isInitialLoading = (loading && scopedComplaints.length === 0 && (!initialComplaints || initialComplaints.length === 0));

  // Area metrics when an area is selected
  const areaMetrics = useMemo(() => {
    if (selectedArea === 'ALL') return null;
    const total = filteredComplaints.length;
    const open = filteredComplaints.filter(c => !['RESOLVED', 'CLOSED'].includes(c.status)).length;
    const inProgress = filteredComplaints.filter(c => ['ASSIGNED', 'IN_PROGRESS', 'ACTION_TAKEN'].includes(c.status)).length;
    const resolved = filteredComplaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length;
    return { total, open, inProgress, resolved };
  }, [selectedArea, filteredComplaints]);

  return (
    <div className="space-y-5">
      {/* ── Section Header ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-extrabold text-[#0f2942] uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4.5 h-4.5 text-[#0f2942]" />
            <span>Geographic Complaint Overview</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            View citizen complaints by state, district and area. Darker areas have more citizen complaints.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isInitialLoading || isUpdating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Refresh Complaints Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating || isInitialLoading ? 'animate-spin text-[#0f2942]' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* ── Location Filter Card (Automatic Cascading Hierarchy) ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* State Dropdown */}
          <div>
            <label htmlFor="geo-state-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              State
            </label>
            <select
              id="geo-state-select"
              value={selectedState}
              onChange={handleStateChange}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-[#0f2942] outline-none cursor-pointer"
            >
              <option value="ALL">All States ({statesList.length})</option>
              {statesList.map((st) => (
                <option key={st.name} value={st.name}>
                  {st.name} {st.code ? `(${st.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* District Dropdown (Depends on State) */}
          <div>
            <label htmlFor="geo-district-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              District
            </label>
            <select
              id="geo-district-select"
              value={selectedDistrict}
              onChange={handleDistrictChange}
              disabled={selectedState === 'ALL'}
              className={`w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-semibold outline-none ${
                selectedState === 'ALL'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-50 text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#0f2942] cursor-pointer'
              }`}
            >
              <option value="ALL">
                {selectedState === 'ALL' ? 'All Districts' : `All Districts (${availableDistricts.length})`}
              </option>
              {availableDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Area / Locality Dropdown (Depends on State / District) */}
          <div>
            <label htmlFor="geo-area-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Area / Locality
            </label>
            <select
              id="geo-area-select"
              value={selectedArea}
              onChange={handleAreaChange}
              disabled={selectedState === 'ALL'}
              className={`w-full text-xs rounded-lg px-3 py-2 font-semibold outline-none border border-slate-300 ${
                selectedState === 'ALL'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-50 text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#0f2942] cursor-pointer'
              }`}
            >
              <option value="ALL">
                {selectedState === 'ALL'
                  ? 'All Areas'
                  : availableAreas.length > 0
                  ? `All Areas (${availableAreas.length})`
                  : 'All Areas'}
              </option>
              {availableAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
              {selectedArea !== 'ALL' && !availableAreas.includes(selectedArea) && (
                <option value={selectedArea}>{selectedArea}</option>
              )}
            </select>
          </div>
        </div>

        {/* Active Scope & Status Indicator (NO View Complaints Button) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600 font-medium">
            <div>
              Active Scope:{' '}
              <strong className="text-slate-900">
                {activeScopeText}
              </strong>
            </div>

            {/* Small status indicator while updating automatically */}
            {isUpdating && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#003875] font-semibold animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-[#003875]" />
                <span>Updating complaint data...</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(selectedState !== defaultState || selectedDistrict !== 'ALL' || selectedArea !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Reset all filters to default"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Map & Top Areas Row (Desktop Side-by-Side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── Left / Main: Map & Geographic Concentration Display ── */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Map Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#0f2942]" />
                  <span>{mapTitle}</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {filteredComplaints.length} genuine citizen complaint{filteredComplaints.length === 1 ? '' : 's'} recorded
                </span>
              </div>

              {/* Breadcrumb Back Links */}
              <div className="flex items-center gap-2">
                {selectedArea !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedArea('ALL')}
                    className="text-[11px] text-[#003875] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    &larr; Back to {selectedDistrict} Areas
                  </button>
                )}
                {selectedDistrict !== 'ALL' && selectedArea === 'ALL' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDistrict('ALL');
                      setSelectedArea('ALL');
                    }}
                    className="text-[11px] text-[#003875] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    &larr; Back to {selectedState} Districts
                  </button>
                )}
              </div>
            </div>

            {/* Visual Geographic Concentration Grid / Area Overview */}
            {isInitialLoading ? (
              <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0f2942]" />
                <span>Loading complaint concentration map...</span>
              </div>
            ) : fetchError ? (
              <div className="py-16 text-center text-xs text-red-600 space-y-2">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                <p className="font-semibold">{fetchError}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-2 px-3 py-1.5 rounded border border-red-300 bg-white hover:bg-red-50 text-red-700 font-semibold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : selectedArea !== 'ALL' ? (
              /* Specific Locality Complaint Overview */
              filteredComplaints.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No complaint location data available.</p>
                  <p className="text-slate-400 mt-0.5">There are zero citizen complaints registered for this location.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Metric Cards for Area */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block mb-0.5">Total Dockets</span>
                      <div className="text-xl font-bold font-mono text-slate-900">{areaMetrics?.total ?? 0}</div>
                    </div>
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                      <span className="text-[11px] font-bold text-amber-800 uppercase block mb-0.5">Open Queue</span>
                      <div className="text-xl font-bold font-mono text-amber-900">{areaMetrics?.open ?? 0}</div>
                    </div>
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                      <span className="text-[11px] font-bold text-blue-800 uppercase block mb-0.5">In Progress</span>
                      <div className="text-xl font-bold font-mono text-blue-900">{areaMetrics?.inProgress ?? 0}</div>
                    </div>
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase block mb-0.5">Resolved</span>
                      <div className="text-xl font-bold font-mono text-emerald-900">{areaMetrics?.resolved ?? 0}</div>
                    </div>
                  </div>

                  {/* Reported Issue Types in Locality */}
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">Reported Issues in {selectedArea}</span>
                    <div className="flex flex-wrap gap-2">
                      {topAreasRanking.map((issue) => (
                        <span key={issue.name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 text-xs text-slate-700 shadow-2xs font-medium">
                          <span>{issue.name}</span>
                          <span className="bg-slate-100 text-slate-800 text-[10px] font-mono px-1.5 py-0.2 rounded font-bold">{issue.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ) : concentrationData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No complaint location data available.</p>
                <p className="text-slate-400 mt-0.5">There are zero citizen complaints registered for this location.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {concentrationData.map((item) => {
                  const style = getIntensityStyle(item.count);
                  const isInteractive = item.type === 'state' || item.type === 'district' || item.type === 'area';

                  return (
                    <div
                      key={item.name}
                      onClick={() => isInteractive && handleItemClick(item)}
                      title={`${item.name}: ${item.count} complaint${item.count === 1 ? '' : 's'} (${style.label})`}
                      className={`p-3 rounded-lg border text-left transition-all ${style.cardBg} ${
                        isInteractive ? 'cursor-pointer hover:shadow-xs' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-xs font-bold truncate max-w-[120px] block leading-tight">
                          {item.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${style.badgeBg}`}>
                          {item.count}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>{item.count === 0 ? '0 reports' : `${item.count} report${item.count === 1 ? '' : 's'}`}</span>
                        {isInteractive && item.count > 0 && (
                          <span className="text-[9px] font-semibold text-[#003875]">&rarr;</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Simple Legend (As Specified) ── */}
          <div className="pt-4 mt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-3 font-semibold text-[11px]">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Low</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Moderate</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <span>High</span>
              </span>
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              Darker areas = more citizen complaints
            </span>
          </div>
        </div>

        {/* ── Right: Top Areas by Complaints Card ── */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3.5 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {topAreasTitle}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedArea !== 'ALL'
                  ? `Breakdown of reports within ${selectedArea}`
                  : 'Highest concentration of genuine citizen complaints'}
              </p>
            </div>

            {isInitialLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0f2942]" />
                <span>Loading rankings...</span>
              </div>
            ) : fetchError ? (
              <div className="py-12 text-center text-xs text-red-600">
                Unable to load complaint data.
              </div>
            ) : topAreasRanking.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No complaint location data available.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topAreasRanking.map((area, index) => {
                  const style = getIntensityStyle(area.count);
                  return (
                    <div
                      key={area.name}
                      onClick={() => {
                        if (selectedArea === 'ALL' && selectedDistrict !== 'ALL') {
                          setSelectedArea(area.name);
                        }
                      }}
                      className={`py-2.5 flex items-center justify-between text-xs px-1.5 rounded transition-colors ${
                        selectedArea === 'ALL' && selectedDistrict !== 'ALL' ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-[10px] flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-slate-800 truncate" title={area.name}>
                          {area.name}
                        </span>
                      </div>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ${style.badgeBg}`}>
                        {area.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 mt-4 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            Based strictly on verified citizen docket filings
          </div>
        </div>
      </div>

      {/* ── Important Note Banner (COMPLAINT != VIOLATION) ── */}
      <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Note:</strong> Complaint counts represent citizen reports and do not by themselves indicate confirmed legal violations.
        </div>
      </div>

      {/* ── Citizen Complaints List for Selected Scope ── */}
      {filteredComplaints.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0f2942]" />
              <span>Complaints Dossiers in Selected Jurisdiction ({filteredComplaints.length})</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              Showing genuine citizen reports only
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Complaint ID</th>
                  <th className="py-3 px-4">Product / Commodity</th>
                  <th className="py-3 px-4">Locality &amp; District</th>
                  <th className="py-3 px-4">Reported Issue</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {c.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{c.productName}</div>
                      {c.brand && <div className="text-[11px] text-slate-500 font-normal">{c.brand}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{c.locality || c.location || '—'}</div>
                      <div className="text-[11px] text-slate-500">{c.district ? `${c.district}, ` : ''}{c.state || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        {c.issueCategory || c.reportedIssues?.[0] || 'General Non-Compliance'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} size="small" />
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {new Date(c.createdAt || c.submittedAt || Date.now()).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeoHeatmap;
