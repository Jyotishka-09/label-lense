import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scan, ClipboardList, LogOut, User, RefreshCw, AlertCircle, ArrowRight, Eye } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { fetchComplaints } from '../../services/api';

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchComplaints(user?.id);
        if (!cancelled) {
          setComplaints(data.complaints || []);
        }
      } catch (err) {
        if (!cancelled) setError('Unable to load complaints. Please check your connection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const recentComplaints = complaints.slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6 pt-2">
      {/* Top Welcome Header */}
      <div className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Citizen Grievance Portal
          </div>
          <h1 className="text-2xl font-black text-[#0f2942]">
            Welcome, {user?.name || 'Citizen'}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {user?.email || 'Logged in citizen user'}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Primary Actions: Scan Product & My Complaints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/scan"
          className="flex items-center justify-between p-5 bg-[#0f2942] text-white rounded-lg hover:bg-[#183e63] transition-colors shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm">Scan Product</div>
              <div className="text-xs text-slate-300">Check package declarations</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          to="/citizen/complaints"
          className="flex items-center justify-between p-5 bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-[#0f2942]" />
            </div>
            <div>
              <div className="font-bold text-sm">My Complaints</div>
              <div className="text-xs text-slate-500">
                {loading ? 'Checking records...' : `${complaints.length} complaint${complaints.length === 1 ? '' : 's'}`}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Recent Complaints Section */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5 text-[#0f2942]" />
            Recent Complaints
          </h2>
          {complaints.length > 0 && (
            <Link
              to="/citizen/complaints"
              className="text-xs font-bold text-[#0f2942] hover:underline"
            >
              View All &rarr;
            </Link>
          )}
        </div>

        <div>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0f2942]" />
              <span>Loading complaints...</span>
            </div>
          ) : error ? (
            <div className="p-4 m-4 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500 space-y-3">
              <p className="font-semibold text-slate-700 text-sm">No complaints submitted yet.</p>
              <p className="max-w-xs mx-auto text-slate-500 text-xs">
                Scan a product label to screen mandatory declarations and report any discrepancies.
              </p>
              <Button to="/scan" variant="primary" className="text-xs px-4 py-2 font-bold bg-[#0f2942]">
                <Scan className="w-3.5 h-3.5 mr-1.5" />
                Scan a Product
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Complaint ID</th>
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {c.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div className="font-semibold text-slate-900 truncate max-w-xs">{c.productName}</div>
                        {c.brand && <div className="text-[10px] text-slate-500 truncate">{c.brand}</div>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={c.status} size="small" />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/citizen/complaints/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#0f2942] hover:underline"
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
    </div>
  );
};

export default CitizenDashboard;
