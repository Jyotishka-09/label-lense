import React, { useState } from 'react';
import { 
  MapPin, AlertTriangle, ShieldCheck, Flame, 
  ChevronRight, Building, Layers, Eye, RefreshCw 
} from 'lucide-react';
import StatusBadge from '../StatusBadge';

const GeoHeatmap = ({ zones = [], loading = false, onRefresh }) => {
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.zoneId || 'GAU_METRO');
  const [selectedPincode, setSelectedPincode] = useState(null);

  const selectedZone = zones.find((z) => z.zoneId === selectedZoneId) || zones[0];
  const totalViolations = zones.reduce((sum, z) => sum + (z.violations || 0), 0);
  const totalDockets = zones.reduce((sum, z) => sum + (z.total || 0), 0);

  const getRiskBadge = (level, total = 1) => {
    if (total === 0) {
      return {
        bg: 'bg-slate-50 text-slate-500 border-slate-200',
        dot: 'bg-slate-400',
        label: 'No incidents',
      };
    }
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-600 animate-pulse',
          label: 'Critical Risk',
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50 text-orange-800 border-orange-300',
          dot: 'bg-orange-500',
          label: 'High Risk',
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          label: 'Moderate Risk',
        };
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          label: 'Low Risk',
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Top Legend & Controls ── */}
      <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-sm font-black text-[#0f2942] uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-600" />
            Geographic Risk Heatmap &amp; Enforcement Hotspots
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time incident density and compliance risk index aggregated across state enforcement circles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Risk Level Indicators */}
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Low (0–15)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Moderate (16–39)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-orange-300 bg-orange-50 text-orange-800">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> High (40–69)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-rose-300 bg-rose-50 text-rose-800">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" /> Critical (70+)
            </span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
              title="Refresh Heatmap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0f2942]' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Real Data Empty / Violation Status Banner */}
      {totalViolations === 0 && (
        <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0f2942] flex-shrink-0" />
            <span>
              <strong>Statewide Compliance Status:</strong> No confirmed violation data available.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {totalDockets} active dockets in registry
          </span>
        </div>
      )}

      {/* ── Zone Selection Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {zones.map((zone) => {
          const isSelected = selectedZone?.zoneId === zone.zoneId;
          const riskConfig = getRiskBadge(zone.riskLevel, zone.total);

          return (
            <div
              key={zone.zoneId}
              onClick={() => {
                setSelectedZoneId(zone.zoneId);
                setSelectedPincode(null);
              }}
              className={`p-4 rounded-lg border transition-all cursor-pointer bg-white shadow-xs ${
                isSelected
                  ? 'border-[#0f2942] ring-2 ring-[#0f2942]/20'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                  {zone.district}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${riskConfig.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${riskConfig.dot}`} />
                  {riskConfig.label}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm tracking-tight mb-2">
                {zone.zoneName}
              </h3>

              <div className="grid grid-cols-3 gap-1 py-2 border-t border-b border-slate-100 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Dockets</span>
                  <span className="text-xs font-bold text-slate-800">{zone.total}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Open</span>
                  <span className="text-xs font-bold text-amber-700">{zone.open}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Violations</span>
                  <span className="text-xs font-bold text-rose-700">{zone.violations}</span>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>{zone.pincodes?.length || 0} Key Pincodes</span>
                <span className="font-bold text-[#0f2942] flex items-center">
                  View Drill-Down &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Selected Zone Drill-Down Console ── */}
      {selectedZone && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
          {/* Zone Header Banner */}
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-[#0f2942] bg-slate-200 px-2 py-0.5 rounded">
                  ZONE: {selectedZone.zoneId}
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {selectedZone.zoneName} &bull; Pincode Drill-Down
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Jurisdiction: {selectedZone.district}, {selectedZone.state} &bull; Circle HQ: {selectedZone.hq}
                {selectedZone.violations === 0 && (
                  <span className="text-slate-500 font-medium"> &bull; (No confirmed violation data available)</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded">
                <span className="text-slate-500 mr-1.5">Zone Risk Score:</span>
                <span className="font-mono font-black text-slate-900">{selectedZone.riskScore}/100</span>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded border flex items-center gap-1 ${getRiskBadge(selectedZone.riskLevel, selectedZone.total).bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${getRiskBadge(selectedZone.riskLevel, selectedZone.total).dot}`} />
                {getRiskBadge(selectedZone.riskLevel, selectedZone.total).label}
              </span>
            </div>
          </div>

          {/* Pincode Hotspot Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Pincode</th>
                  <th className="py-3 px-4">Commercial Hub &amp; Locality</th>
                  <th className="py-3 px-4">Market Classification</th>
                  <th className="py-3 px-4 text-center">Active Dockets</th>
                  <th className="py-3 px-4 text-center">Open Queue</th>
                  <th className="py-3 px-4 text-center">Violations</th>
                  <th className="py-3 px-4 text-center">Risk Level</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedZone.pincodes?.map((pin) => {
                  const pinRisk = getRiskBadge(pin.riskLevel, pin.total);
                  const isPinSelected = selectedPincode?.pincode === pin.pincode;

                  return (
                    <tr 
                      key={pin.pincode} 
                      className={`transition-colors cursor-pointer ${
                        isPinSelected ? 'bg-slate-100/70 font-medium' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedPincode(isPinSelected ? null : pin)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {pin.pincode}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {pin.locality}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                          {pin.hubType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800">
                        {pin.total}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                        {pin.open}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-700">
                        {pin.violations}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${pinRisk.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pinRisk.dot}`} />
                          {pinRisk.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-xs font-semibold text-[#0f2942] hover:underline">
                          {isPinSelected ? 'Hide Dossiers' : 'Inspect'} &rarr;
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pincode Dossier Drill-Down Drawer */}
          {selectedPincode && (
            <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0f2942]" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Recent Dockets in {selectedPincode.locality} (Pincode: {selectedPincode.pincode})
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedPincode(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Close &times;
                </button>
              </div>

              {selectedPincode.recentDockets?.length === 0 ? (
                <div className="p-4 bg-white rounded border border-slate-200 text-xs text-slate-500 text-center">
                  No active or historical complaints logged for Pincode {selectedPincode.pincode}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedPincode.recentDockets.map((docket) => (
                    <div key={docket.id} className="p-3 bg-white rounded border border-slate-200 shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-slate-900">{docket.id}</span>
                        <StatusBadge status={docket.status} size="small" />
                      </div>
                      <div className="text-xs font-semibold text-slate-800 truncate">{docket.productName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{docket.issueCategory}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeoHeatmap;
