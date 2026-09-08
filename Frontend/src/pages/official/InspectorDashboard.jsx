import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, Search, RefreshCw, AlertCircle, Eye, Shield 
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { fetchComplaints } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const InspectorDashboard = () => {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'UNDER_INSPECTION' | 'COMPLETED'
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchComplaints();
      setComplaints(data.complaints || []);
    } catch (err) {
      setLoadError('Unable to load complaints from registry. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 3 Required metrics calculated dynamically from actual complaints
  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'SUBMITTED' || c.status === 'PENDING').length;
  const underInspection = complaints.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'INSPECTION_IN_PROGRESS').length;
  const completed = complaints.filter(c => c.status === 'INSPECTION_COMPLETED' || c.status === 'CLOSED').length;

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'PENDING' && !(c.status === 'SUBMITTED' || c.status === 'PENDING')) return false;
    if (statusFilter === 'UNDER_INSPECTION' && !(c.status === 'UNDER_REVIEW' || c.status === 'INSPECTION_IN_PROGRESS')) return false;
    if (statusFilter === 'COMPLETED' && !(c.status === 'INSPECTION_COMPLETED' || c.status === 'CLOSED')) return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.id.toLowerCase().includes(q) ||
      (c.productName || '').toLowerCase().includes(q) ||
      (c.issueCategory || '').toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 pt-2">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Legal Metrology Department &bull; Field Enforcement
          </div>
          <h1 className="text-2xl font-black text-[#0f2942] tracking-tight">
            Inspector Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Inspection queue under Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 transition-colors"
            title="Refresh complaints"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0f2942]' : ''}`} />
          </button>
          <div className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-slate-800 font-semibold">
            Inspector: {user?.name || 'Officer'}
          </div>
        </div>
      </div>

      {loadError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pending, color: 'text-amber-700', note: 'Awaiting inspection', filter: 'PENDING' },
          { label: 'Under Inspection', value: underInspection, color: 'text-indigo-700', note: 'Investigation in progress', filter: 'UNDER_INSPECTION' },
          { label: 'Completed', value: completed, color: 'text-emerald-700', note: 'Decisions filed', filter: 'COMPLETED' },
        ].map((item) => (
          <div
            key={item.label}
            onClick={() => setStatusFilter(item.filter)}
            className={`bg-white rounded-lg border p-4 shadow-xs cursor-pointer transition-all ${
              statusFilter === item.filter ? 'border-[#0f2942] ring-1 ring-[#0f2942]' : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              {item.label}
            </span>
            <div className={`text-2xl font-extrabold font-mono ${item.color}`}>
              {loading ? '—' : item.value}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">{item.note}</span>
          </div>
        ))}
      </div>

      {/* Complaints Section */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        {/* Filters & Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: 'All', count: total },
              { id: 'PENDING', label: 'Pending', count: pending },
              { id: 'UNDER_INSPECTION', label: 'Under Inspection', count: underInspection },
              { id: 'COMPLETED', label: 'Completed', count: completed },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-[#0f2942] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docket, product..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] outline-none text-slate-800"
            />
          </div>
        </div>

        {/* Complaints Table */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0f2942]" />
            <span>Loading complaints queue...</span>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <ClipboardList className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700 text-sm">No complaints assigned.</p>
            <p className="text-slate-400">
              {searchQuery ? 'No complaints match your search query.' : 'No dockets found in this status category.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Complaint ID</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Issue</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {c.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{c.productName}</div>
                      {c.brand && <div className="text-[11px] text-slate-500">{c.brand}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800 text-[11px]">
                        {c.issueCategory || 'Other'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} size="small" />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/official/inspector/inspection/${c.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#0f2942] hover:bg-[#183e63] text-white font-semibold text-xs transition-colors shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InspectorDashboard;
