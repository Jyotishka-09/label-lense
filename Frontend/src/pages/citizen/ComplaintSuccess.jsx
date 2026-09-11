import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, FileText, ArrowRight,
  Printer, ClipboardList, Home
} from 'lucide-react';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';

const ComplaintSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const complaint = location.state?.complaint;

  // If accessed directly without state, show a clear message
  if (!complaint) {
    return (
      <div className="max-w-2xl mx-auto pb-12">
        <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">Complaint Not Found</h1>
          <p className="text-xs text-slate-500 mb-6">
            No complaint data is available. Please submit a complaint through the scan flow.
          </p>
          <div className="flex gap-3 justify-center">
            <Button to="/citizen" variant="secondary" className="text-xs">Back to Dashboard</Button>
            <Button to="/scan" variant="primary" className="text-xs">Scan a Product</Button>
          </div>
        </div>
      </div>
    );
  }

  const handlePrint = () => window.print();

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">

        {/* Success Banner */}
        <div className="p-8 text-center bg-emerald-50/60 border-b border-emerald-100 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
            <span>Official Acknowledgement</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Complaint Submitted Successfully
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-md">
            Your grievance has been lodged under the Legal Metrology (Packaged Commodities)
            Rules, 2011 and forwarded to the District Enforcement Unit for review.
          </p>

          {/* Complaint ID badge */}
          <div className="mt-4 px-4 py-2 bg-white rounded-lg border border-emerald-300 shadow-xs flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Complaint ID:</span>
            <span className="font-mono text-base font-extrabold text-[#0f2942] tracking-wider">
              {complaint.id}
            </span>
          </div>

          {/* Status */}
          <div className="mt-3">
            <StatusBadge status={complaint.status || 'SUBMITTED'} size="small" />
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0f2942]" />
              Complaint Summary
            </h2>
            <StatusBadge status={complaint.status || 'SUBMITTED'} size="small" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Commodity:</span>
              <span className="font-semibold text-slate-900">{complaint.productName}</span>
              {complaint.brand && (
                <span className="text-slate-500 block text-[11px]">({complaint.brand})</span>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Reported Issues:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(complaint.reportedIssues && complaint.reportedIssues.length > 0
                  ? complaint.reportedIssues
                  : [complaint.issueCategory || 'Other']
                ).map((iss, idx) => (
                  <span
                    key={idx}
                    className="inline-block bg-white border border-slate-300 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-800"
                  >
                    {iss}
                  </span>
                ))}
              </div>
              {complaint.otherIssueDescription && (
                <span className="text-slate-500 text-[10px] block mt-1 italic">
                  Note: "{complaint.otherIssueDescription}"
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Complaint Location:</span>
              <div className="font-semibold text-slate-900 flex items-start gap-1 mt-0.5">
                <span>📍</span>
                <span>{complaint.location || '—'}</span>
              </div>
              {complaint.latitude != null && (
                <span className="text-[10px] text-slate-400 font-mono block mt-1 pl-4">
                  {Number(complaint.latitude).toFixed(4)}° N, {Number(complaint.longitude).toFixed(4)}° E
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Assigned Inspector:</span>
              {complaint.inspectorId ? (
                <div>
                  <span className="font-bold text-[#0f2942]">{complaint.inspectorName || 'Enforcement Inspector'}</span>
                  <span className="text-[11px] font-mono text-slate-600 block">Badge: {complaint.inspectorId}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Automatically assigned
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-bold text-amber-800">Inspector Assignment Pending</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Forwarded to Authority Portal for allocation
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 sm:col-span-2">
              <span className="text-slate-500 block text-[11px]">Date &amp; Time Lodged:</span>
              <span className="font-semibold text-slate-900">
                {new Date(complaint.createdAt || complaint.submittedAt).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* What happens next */}
          <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200 text-xs text-slate-700 space-y-2">
            <h3 className="font-bold text-[#0f2942] uppercase text-[11px] tracking-wider">
              What Happens Next
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed">
              <li>Assigned Legal Metrology Inspector reviews your evidence and AI findings.</li>
              <li>Officer conducts on-site retail inspection with fresh photographic evidence.</li>
              <li>Batch verification, invoice checks, and notice issuance under Legal Metrology Act, 2009.</li>
              <li>Official inspection report filed into the departmental registry.</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 py-2 px-3 rounded border border-slate-300 hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print Acknowledgement
            </button>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                to="/citizen/complaints"
                variant="secondary"
                className="w-full sm:w-auto text-xs"
              >
                <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
                My Complaints
              </Button>

              <Button
                to="/citizen"
                variant="primary"
                className="w-full sm:w-auto text-xs"
              >
                <Home className="w-3.5 h-3.5 mr-1.5" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintSuccess;
