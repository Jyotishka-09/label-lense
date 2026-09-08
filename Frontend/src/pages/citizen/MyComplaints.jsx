import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, ClipboardList, Scan, Eye, 
  RefreshCw, AlertCircle, ShieldAlert 
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { fetchComplaints } from '../../services/api';

const MyComplaints = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchComplaints(user?.id);
        if (!cancelled) setComplaints(data.complaints || []);
      } catch (err) {
        if (!cancelled) setError('Unable to load complaints. Please check your connection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const filtered = filter === 'ALL'
    ? complaints
    : filter === 'PENDING'
      ? complaints.filter(c => c.status === 'SUBMITTED' || c.status === 'PENDING')
      : filter === 'UNDER_INSPECTION'
        ? complaints.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'INSPECTION_IN_PROGRESS')
        : complaints.filter(c => c.status === 'INSPECTION_COMPLETED' || c.status === 'CLOSED');

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-5 pt-2">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/citizen"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#0f2942] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Dashboard</span>
        </Link>
        <Button to="/scan" variant="primary" className="text-xs px-3.5 py-1.5 font-bold bg-[#0f2942]">
          <Scan className="w-3.5 h-3.5 mr-1.5" />
          Scan Product
        </Button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0f2942] uppercase tracking-wider mb-0.5">
            <ClipboardList className="w-4 h-4" />
            <span>Citizen Grievance Docket</span>
          </div>
          <h1 className="text-2xl font-black text-[#0f2942] tracking-tight">
            My Complaints
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Status and details of your submitted product labelling complaints.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'UNDER_INSPECTION', label: 'Under Inspection' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                filter === tab.id
                  ? 'bg-[#0f2942] text-white border-[#0f2942]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0f2942]" />
            <span>Loading complaints registry...</span>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700 text-sm">No complaints submitted yet.</p>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              {filter === 'ALL'
                ? 'Scan a product label to screen mandatory declarations and report any discrepancies.'
                : `No complaints found in ${filter.replace(/_/g, ' ').toLowerCase()} status.`}
            </p>
            {filter === 'ALL' && (
              <Button to="/scan" variant="primary" className="text-xs px-4 py-2 font-bold bg-[#0f2942]">
                <Scan className="w-3.5 h-3.5 mr-1.5" />
                Scan a Product
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Complaint ID</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {c.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{c.productName}</div>
                      {c.brand && <div className="text-[11px] text-slate-500">{c.brand}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {new Date(c.createdAt || c.submittedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} size="small" />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/citizen/complaints/${c.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0f2942] text-white hover:bg-[#183e63] font-semibold text-xs shadow-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
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

export default MyComplaints;
