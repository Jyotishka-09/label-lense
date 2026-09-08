import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldAlert, ArrowLeft, MapPin, Package, 
  AlertCircle, CheckCircle2, RefreshCw 
} from 'lucide-react';
import Button from '../../components/Button';
import { createComplaint } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ISSUE_CATEGORIES = [
  'MRP / Price Discrepancy',
  'Net Quantity Underweight / Missing',
  'Date of Manufacture / Expiry Smudged or Missing',
  'Missing Manufacturer / Packer Name or Address',
  'Missing Mandatory Declarations',
  'Consumer Care Details Missing',
  'Country of Origin Missing',
  'Other Labelling Violation',
];

const Complaint = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const scanData = location.state || {};
  const extracted = scanData.extractedSummary || scanData.scanResult?.extracted || {};
  const productName = scanData.productName || extracted.product_name || 'Packaged Commodity';
  const brand = scanData.brandName || extracted.manufacturer_or_packer || '';
  const mrp = extracted.mrp || '';
  const netQuantity = extracted.net_quantity || '';
  const mfgDate = extracted.manufacturing_or_packing_date || '';
  const images = scanData.images || [];

  // 3 required fields from the citizen:
  const [issueCategory, setIssueCategory] = useState(ISSUE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!purchaseLocation.trim()) {
      setError('Please specify the purchase location (store name, area, or city).');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a brief description of the labelling issue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        citizenId: user?.id || 'CIT-001',
        citizenName: user?.name || 'Citizen User',
        citizenContact: user?.email || 'citizen@labellens.gov.in',
        productName: productName.trim(),
        brand: brand.trim(),
        category: 'Packaged Commodity',
        sourceType: 'Retail Store',
        location: purchaseLocation.trim(),
        issueCategory,
        citizenDescription: description.trim(),
        extractedData: extracted,
        aiFindings: scanData.scanResult?.compliance || scanData.complianceResult || {
          overallStatus: 'REVIEW',
          declarations: [],
        },
        citizenImages: images.map(img => ({
          name: img.name,
          category: img.category,
          previewUrl: img.previewUrl,
          size: img.size,
        })),
      };

      const result = await createComplaint(payload);

      navigate('/complaint/success', {
        state: { complaint: result.complaint },
        replace: true,
      });
    } catch (err) {
      console.error('[Complaint] Error submitting complaint:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit complaint. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-16 space-y-6 pt-2">
      {/* Top Breadcrumb */}
      <Link
        to="/scan/result"
        state={scanData}
        className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#0f2942] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
        <span>Back to Scan Results</span>
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0f2942] uppercase tracking-wider mb-1">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Lodge Formal Grievance</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#0f2942] tracking-tight">
          Report Labelling Issue
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Submit this product to the Legal Metrology Enforcement Directorate for on-site inspection.
        </p>
      </div>

      {/* Automatically displayed scanned product info (Read-only card) */}
      <section className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#0f2942]" />
            Scanned Product Information
          </h2>
          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            Auto-detected
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 sm:col-span-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Product Name</span>
            <span className="font-bold text-slate-900">{productName}</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Manufacturer</span>
            <span className="font-semibold text-slate-900 truncate block">{brand || '—'}</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">MRP</span>
            <span className="font-mono font-bold text-slate-900">{mrp || '—'}</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Net Quantity</span>
            <span className="font-semibold text-slate-900">{netQuantity || '—'}</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Date of Packing</span>
            <span className="font-semibold text-slate-900">{mfgDate || '—'}</span>
          </div>
        </div>
      </section>

      {/* Citizen input form (only 3 fields: Category, Description, Location) */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-300 p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
          Citizen Complaint Details
        </h2>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Issue Category */}
        <div>
          <label htmlFor="issue-category" className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
            Issue Category <span className="text-red-600">*</span>
          </label>
          <select
            id="issue-category"
            value={issueCategory}
            onChange={(e) => setIssueCategory(e.target.value)}
            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-slate-900 font-medium"
          >
            {ISSUE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 2. Location */}
        <div>
          <label htmlFor="purchase-location" className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
            Location / Store Details <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <input
              id="purchase-location"
              type="text"
              required
              value={purchaseLocation}
              onChange={(e) => setPurchaseLocation(e.target.value)}
              placeholder="e.g. Daily Fresh Mart, Paltan Bazaar, Guwahati"
              className="w-full text-xs pl-8 pr-3 py-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-slate-900"
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Provide the retail store name and locality for the field inspector's visit.
          </span>
        </div>

        {/* 3. Description */}
        <div>
          <label htmlFor="citizen-description" className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
            Description of Issue <span className="text-red-600">*</span>
          </label>
          <textarea
            id="citizen-description"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the discrepancy observed (e.g. price sticker pasted over printed MRP, expiry date smudged, package feels underweight)..."
            className="w-full text-xs p-3 border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-slate-800 leading-relaxed"
          />
        </div>

        {/* Action Button: Submit Complaint */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="w-full py-3 text-xs font-bold bg-[#0f2942] hover:bg-[#183e63] shadow-xs"
          >
            {isSubmitting ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Submitting Complaint...</>
            ) : (
              'Submit Complaint'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Complaint;
