import React from 'react';
import { 
  AlertTriangle, TrendingUp, BarChart3, ShieldAlert, 
  Layers, Tag, Activity, RefreshCw 
} from 'lucide-react';

const RiskMatrix = ({ riskData = {}, loading = false, onRefresh }) => {
  const categories = riskData.categoryRisk || [];
  const typologies = riskData.violationTypologies || [];
  const totalEvaluated = riskData.totalRecordsEvaluated || 0;

  const getRiskBadge = (level) => {
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
          label: 'Moderate',
        };
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          label: 'Low Risk',
        };
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'MODERATE':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Summary ── */}
      <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-sm font-black text-[#0f2942] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-[#0f2942]" />
            Commodity Risk Aggregation &amp; Violation Typologies
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical distribution of non-compliance patterns across packaged commodity categories and Legal Metrology rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded border border-slate-200 font-mono">
            <strong>{totalEvaluated}</strong> total dockets evaluated
          </span>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
              title="Refresh Risk Matrix"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0f2942]' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* ── Section 1: Commodity Category Risk Matrix ── */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#0f2942]" />
            Commodity Category Risk Matrix
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            {categories.length} Identified Product Segments
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Evaluating category risk statistics...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No confirmed violation data available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Commodity Segment</th>
                  <th className="py-3 px-4 text-center">Total Dockets</th>
                  <th className="py-3 px-4 text-center">Open Queue</th>
                  <th className="py-3 px-4 text-center">Confirmed Violations</th>
                  <th className="py-3 px-4">Violation Rate</th>
                  <th className="py-3 px-4">Primary Typology</th>
                  <th className="py-3 px-4 text-center">Risk Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {categories.map((c) => {
                  const riskBadge = getRiskBadge(c.riskLevel);
                  return (
                    <tr key={c.category} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {c.category}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-800">
                        {c.totalDockets}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-700">
                        {c.openDockets}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-700">
                        {c.violations}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${
                                c.violationRate >= 50
                                  ? 'bg-rose-600'
                                  : c.violationRate >= 25
                                  ? 'bg-orange-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, c.violationRate)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold text-slate-800">
                            {c.violationRate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {c.topIssue}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${riskBadge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${riskBadge.dot}`} />
                          {riskBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 2: Violation Typology Breakdown ── */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#0f2942]" />
            Violation Typologies &amp; Legal Metrology Rule Infractions
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            {typologies.length} Non-Compliance Patterns
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading violation typology breakdown...
          </div>
        ) : typologies.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No confirmed violation data available.
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {typologies.map((t) => (
              <div key={t.issueCategory} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-xs">
                    {t.issueCategory}
                  </h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getSeverityBadge(t.severity)}`}>
                    {t.severity} Severity
                  </span>
                </div>

                {/* Progress bar representing share */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Incident Frequency</span>
                    <span className="font-mono font-bold">{t.count} dockets ({t.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#0f2942] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, t.percentage)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Non-Compliant Penalties</span>
                    <span className="font-mono font-bold text-rose-700">{t.nonCompliant} notices</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Inspections Completed</span>
                    <span className="font-mono font-bold text-slate-800">{t.resolved} dockets</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskMatrix;
