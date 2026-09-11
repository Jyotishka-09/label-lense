import React, { useState } from 'react';
import { 
  User, Search, ShieldCheck, FileCheck, AlertCircle, 
  MapPin, Phone, Mail, Award, CheckCircle2, ChevronRight 
} from 'lucide-react';
import StatusBadge from '../StatusBadge';

const InspectorDirectory = ({ inspectors = [], loading = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInspector, setSelectedInspector] = useState(null);

  const filteredInspectors = inspectors.filter((ins) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      ins.name.toLowerCase().includes(q) ||
      ins.fullName.toLowerCase().includes(q) ||
      ins.id.toLowerCase().includes(q) ||
      ins.code.toLowerCase().includes(q) ||
      ins.division.toLowerCase().includes(q) ||
      (ins.jurisdiction || []).some((pin) => pin.includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* ── Directory Header & Search ── */}
      <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div>
          <h2 className="text-sm font-black text-[#0f2942] uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#0f2942]" />
            Field Enforcement Inspector Registry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisory roster of authorized Legal Metrology enforcement officers and their active jurisdictional workloads.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inspector, badge, zone, pincode..."
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-1 focus:ring-[#0f2942] outline-none text-slate-800"
          />
        </div>
      </div>

      {/* ── Inspectors Grid ── */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-300">
          Loading inspector directory...
        </div>
      ) : filteredInspectors.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-300 space-y-2">
          <User className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700 text-sm">
            {searchQuery ? 'No inspector found.' : 'No inspectors found.'}
          </p>
          <p className="text-slate-400 text-xs">
            {searchQuery
              ? `No enforcement inspector matches "${searchQuery}" in the master departmental registry.`
              : 'The enforcement officer directory contains zero registered personnel.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInspectors.map((ins) => {
            const isSelected = selectedInspector?.id === ins.id;

            return (
              <div
                key={ins.id}
                className={`bg-white rounded-lg border p-5 shadow-xs transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#0f2942] ring-2 ring-[#0f2942]/20'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <div>
                  {/* Officer Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0f2942]/10 border border-[#0f2942]/20 flex items-center justify-center text-[#0f2942] font-black text-sm">
                        {ins.name.replace('Inspector ', '').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{ins.fullName}</h3>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {ins.id}
                          </span>
                        </div>
                        <span className="text-xs text-slate-600 block">{ins.role}</span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {ins.status}
                    </span>
                  </div>

                  {/* Jurisdiction & Contact Details */}
                  <div className="space-y-1.5 py-2.5 border-t border-b border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        <strong className="text-slate-800">Division:</strong> {ins.division}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{ins.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{ins.phone}</span>
                    </div>
                  </div>

                  {/* Workload Metrics */}
                  <div className="grid grid-cols-4 gap-2 py-3 text-center">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Assigned</span>
                      <span className="text-sm font-mono font-bold text-slate-900">
                        {ins.workload?.totalAssigned || 0}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Pending</span>
                      <span className="text-sm font-mono font-bold text-amber-700">
                        {ins.workload?.pending || 0}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Active</span>
                      <span className="text-sm font-mono font-bold text-indigo-700">
                        {ins.workload?.inProgress || 0}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Completed</span>
                      <span className="text-sm font-mono font-bold text-emerald-700">
                        {ins.workload?.completed || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action & Profile View */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Jurisdiction: {ins.jurisdiction?.join(', ')}
                  </span>
                  <button
                    onClick={() => setSelectedInspector(isSelected ? null : ins)}
                    className="text-xs font-bold text-[#0f2942] hover:text-[#183e63] flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isSelected ? 'Close Dossier' : 'View Enforcement History'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Detailed Inspector Task History Drawer */}
                {isSelected && (
                  <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Recent Field Dockets Handled by {ins.name}
                    </h4>

                    {ins.recentTasks?.length === 0 ? (
                      <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded border border-slate-200">
                        No inspections found.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {ins.recentTasks.map((t) => (
                          <div key={t.id} className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-mono font-bold text-slate-900 block">{t.id}</span>
                              <span className="font-semibold text-slate-800">{t.productName}</span>
                              <span className="text-slate-500 block text-[10px]">{t.issueCategory} &bull; {t.location}</span>
                            </div>
                            <StatusBadge status={t.status} size="small" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InspectorDirectory;
