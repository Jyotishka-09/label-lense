import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Shield, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { fetchComplaints } from '../../services/api';

const AuthorityDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchComplaints();
      setComplaints(data.complaints || []);
    } catch (err) {
      setError('Unable to connect to complaints registry. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 4 Dynamic metrics calculated from actual complaint data
  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'SUBMITTED' || c.status === 'PENDING').length;
  const underInspection = complaints.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'INSPECTION_IN_PROGRESS').length;
  const completed = complaints.filter(c => c.status === 'INSPECTION_COMPLETED' || c.status === 'CLOSED').length;

  const recentComplaints = complaints.slice(0, 10);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 pt-2">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Legal Metrology Directorate &bull; Supervisory Headquarters
          </div>
          <h1 className="text-2xl font-black text-[#0f2942] tracking-tight">
            Authority Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Supervisory oversight of packaged commodity compliance dockets.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0f2942]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Complaints', value: total, color: 'text-slate-900', note: 'All dockets' },
          { label: 'Pending', value: pending, color: 'text-amber-700', note: 'Awaiting inspection' },
          { label: 'Under Inspection', value: underInspection, color: 'text-indigo-700', note: 'Active in field' },
          { label: 'Completed', value: completed, color: 'text-emerald-700', note: 'Decisions filed' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              {card.label}
            </span>
            <div className={`text-2xl font-extrabold font-mono ${card.color}`}>
              {loading ? '—' : card.value}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">{card.note}</span>
          </div>
        ))}
      </div>

      {/* Recent Complaints Simple Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5 text-[#0f2942]" />
            Recent Complaints
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Showing {recentComplaints.length} of {total} dockets
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0f2942]" />
            <span>Loading complaints from enforcement database...</span>
          </div>
        ) : recentComplaints.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700 text-sm">No complaints submitted yet.</p>
            <p className="text-slate-400">Newly lodged citizen complaints will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Complaint ID</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {c.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{c.productName}</div>
                      {c.brand && <div className="text-[11px] text-slate-500">{c.brand}</div>}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} size="small" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {new Date(c.createdAt || c.submittedAt).toLocaleDateString('en-IN')}
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

export default AuthorityDashboard;
