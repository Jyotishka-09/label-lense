import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Camera, ShieldCheck, 
  RefreshCw, AlertCircle, Clock, Package, Scale 
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import { fetchComplaintById } from '../../services/api';

const ComplaintDetail = () => {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchComplaintById(id);
        if (!cancelled) setComplaint(data.complaint);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.status === 404 ? 'Complaint not found.' : 'Unable to load complaint details.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
        <RefreshCw className="w-4 h-4 animate-spin text-[#0f2942]" />
        <span>Loading complaint details...</span>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-lg border border-slate-300 p-8 shadow-xs">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800 mb-1">Grievance Not Found</h2>
          <p className="text-xs text-slate-500 mb-5">{error || `Docket ${id} could not be found.`}</p>
          <Button to="/citizen/complaints" variant="secondary" className="text-xs px-4 py-2">
            Back to My Complaints
          </Button>
        </div>
      </div>
    );
  }

  const isCompleted = complaint.status === 'INSPECTION_COMPLETED' || Boolean(complaint.officerDecision) || Boolean(complaint.inspectionReport);
  const citizenImgs = complaint.citizenImages?.length ? complaint.citizenImages : (complaint.images || []);
  const initialDeclarations = complaint.aiFindings?.declarations || [];
  const officerDecision = complaint.officerDecision || complaint.inspectionReport?.officerDecision;
  const officerRemarks = complaint.officerRemarks || complaint.inspectionReport?.officerRemarks || complaint.inspectionReport?.officerNotes;

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-6 pt-2">
      {/* Top Breadcrumb */}
      <Link
        to="/citizen/complaints"
        className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#0f2942] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        <span>Back to My Complaints</span>
      </Link>

      {/* Header: Complaint ID, Status, Date */}
      <div className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
            Legal Metrology Grievance Docket
          </div>
          <h1 className="text-2xl font-mono font-black text-[#0f2942]">
            {complaint.id}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Submitted: {new Date(complaint.createdAt || complaint.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Current Status</span>
          <StatusBadge status={complaint.status} size="large" />
        </div>
      </div>

      {/* PRODUCT INFORMATION */}
      <section className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#0f2942]" />
            Product Information
          </h2>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded border border-slate-200 sm:col-span-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Product Name</span>
            <span className="font-bold text-slate-900 text-sm">{complaint.productName}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Manufacturer / Packer</span>
            <span className="font-semibold text-slate-800">{complaint.extractedData?.manufacturer_or_packer || complaint.brand || '—'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Net Quantity</span>
            <span className="font-semibold text-slate-800">{complaint.extractedData?.net_quantity || '—'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">MRP</span>
            <span className="font-mono font-bold text-slate-900">{complaint.extractedData?.mrp || '—'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Dates</span>
            <span className="font-semibold text-slate-800">{complaint.extractedData?.manufacturing_or_packing_date || complaint.extractedData?.best_before_or_use_by || '—'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 sm:col-span-3">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Reported Store Location</span>
            <span className="font-semibold text-slate-900">{complaint.location || '—'}</span>
          </div>
        </div>
      </section>

      {/* CITIZEN DESCRIPTION */}
      <section className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#0f2942]" />
          Citizen Description
        </h2>
        <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
          {complaint.citizenDescription || 'No description provided.'}
        </div>
      </section>

      {/* CITIZEN EVIDENCE */}
      {citizenImgs.length > 0 && (
        <section className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#0f2942]" />
            Citizen Evidence ({citizenImgs.length} photo{citizenImgs.length !== 1 ? 's' : ''})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {citizenImgs.map((img, i) => (
              <div key={i} className="rounded border border-slate-200 overflow-hidden bg-slate-50 text-center p-1.5">
                <div className="h-28 flex items-center justify-center bg-white rounded">
                  <img src={img.previewUrl || img} alt={img.name || `Photo ${i + 1}`} className="max-h-full max-w-full object-contain" />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold block truncate mt-1">
                  {img.category || img.name || `Photo ${i + 1}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* INITIAL AI FINDING */}
      {initialDeclarations.length > 0 && (
        <section className="bg-white rounded-lg border border-amber-300 shadow-xs overflow-hidden">
          <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950">
              Initial AI Finding
            </h2>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              Preliminary Scan
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {initialDeclarations.map((d, i) => (
              <div key={i} className="px-5 py-2.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{d.field}</span>
                  {d.detectedText && <span className="text-slate-500 font-mono text-[11px] block mt-0.5">{d.detectedText}</span>}
                </div>
                <StatusBadge status={d.status} size="small" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* OFFICIAL INSPECTION RESULT (If completed) */}
      {isCompleted ? (
        <section className="bg-white rounded-lg border-2 border-[#0f2942] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-[#0f2942] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wide">
                Official Inspection Determination
              </h2>
            </div>
            <StatusBadge status={complaint.status} size="small" />
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Inspection Status</span>
                <span className="font-mono font-bold text-slate-900">{complaint.status}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Officer Decision</span>
                <StatusBadge status={officerDecision || 'NON_COMPLIANT'} size="normal" />
              </div>
            </div>

            {officerRemarks && (
              <div className="p-3.5 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Officer Remarks</span>
                <p className="text-slate-800 font-medium leading-relaxed">{officerRemarks}</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-[#0f2942] flex-shrink-0" />
          <span>
            This grievance is currently awaiting physical inspection by an assigned Legal Metrology Officer. Once on-site verification is completed, the official decision will appear here.
          </span>
        </div>
      )}
    </div>
  );
};

export default ComplaintDetail;
