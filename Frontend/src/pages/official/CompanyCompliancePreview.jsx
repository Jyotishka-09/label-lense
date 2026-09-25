import React, { useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowLeft, ScanLine, Printer, CheckCircle2, AlertTriangle, FileText, Image as ImageIcon } from 'lucide-react';

/**
 * CompanyCompliancePreview
 * ------------------------
 * Simplified Product Analysis & Label Review screen for companies.
 * Self-assessment only — no public reporting or complaint capabilities.
 */
const CompanyCompliancePreview = () => {
  const location = useLocation();
  const printRef = useRef(null);

  const previewData = location.state;

  if (!previewData || (!previewData.scanResult && !previewData.auditRecord)) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-lg border border-slate-200 p-8 space-y-3">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-sm font-bold text-slate-800">No Product Scan Available</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Please upload a product packaging image to view label analysis.
          </p>
          <div className="pt-2">
            <Link
              to="/official/company/scan"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#102a43] text-white text-xs font-semibold hover:bg-[#1e3a5f] transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan Product</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { 
    productName, 
    brandName, 
    category, 
    skuCode, 
    images = [], 
    scanResult = {}, 
    auditRecord = {} 
  } = previewData;

  const extracted = scanResult.extracted || {};
  const compliance = scanResult.compliance || {};

  const detectedName = extracted.product_name || productName || 'Packaged Commodity';
  const detectedManufacturer = extracted.manufacturer_or_packer || brandName || 'Not detected';
  const detectedNetQty = extracted.net_quantity || 'Not detected';
  const detectedMrp = extracted.mrp != null && extracted.mrp !== '' 
    ? (String(extracted.mrp).startsWith('₹') ? extracted.mrp : `₹${extracted.mrp}`) 
    : 'Not detected';
  const detectedMfgDate = extracted.manufacturing_or_packing_date || 'Not detected';
  const detectedBestBefore = extracted.best_before_or_use_by || 'Not detected';
  const detectedConsumerCare = extracted.consumer_care || 'Not detected';
  const detectedOrigin = extracted.country_of_origin || 'India';

  // Determine issues found
  const issues = [];
  if (!extracted.product_name && (!productName || productName === 'Packaged Commodity')) {
    issues.push('Product name declaration requires review');
  }
  if (!extracted.manufacturer_or_packer && (!brandName || brandName === 'Company Brand')) {
    issues.push('Manufacturer / packer information not detected');
  }
  if (!extracted.net_quantity || extracted.net_quantity === 'Not detected') {
    issues.push('Net quantity could not be reliably detected');
  }
  if (extracted.mrp == null || extracted.mrp === '' || detectedMrp === 'Not detected') {
    issues.push('MRP could not be reliably detected');
  }
  if (!extracted.manufacturing_or_packing_date || extracted.manufacturing_or_packing_date === 'Not detected') {
    issues.push('Manufacturing / packing date requires review');
  }
  if (!extracted.consumer_care || extracted.consumer_care === 'Not detected') {
    issues.push('Consumer care information not detected');
  }
  if (!extracted.best_before_or_use_by || extracted.best_before_or_use_by === 'Not detected') {
    // Only flag best before if perishable/fmcg or missing
    if (category && (category.includes('Food') || category.includes('Dairy') || category.includes('Beverage'))) {
      issues.push('Best before / use by date requires review');
    }
  }

  // Also include any findings from compliance engine with status !== PASS
  if (Array.isArray(compliance.findings)) {
    compliance.findings.forEach(f => {
      if (f.status && f.status !== 'PASS' && f.rule_name) {
        const issueText = `${f.rule_name}: ${f.summary || 'Requires review'}`;
        if (!issues.includes(issueText) && issues.length < 5) {
          issues.push(issueText);
        }
      }
    });
  }

  const isPass = issues.length === 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div ref={printRef} className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* ── Top Navigation & Actions ── */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          to="/official/company"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#102a43] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Company Dashboard</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            title="Print Summary"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Summary</span>
          </button>

          <Link
            to="/official/company/scan"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#102a43] hover:bg-[#1e3a5f] text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Rescan</span>
          </Link>
        </div>
      </div>

      {/* ── Page Header ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Preliminary Label Analysis
          </span>
          <h1 className="text-xl font-bold text-[#102a43] tracking-tight">
            {detectedName}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Review packaging declarations detected from your uploaded product label.
          </p>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md border ${
            isPass
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}>
            {isPass ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>PASS</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>REVIEW</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* ── Section 7: Product Analysis ── */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-[#102a43]">
            Product Analysis
          </h2>
        </div>

        <div className="p-6 divide-y divide-slate-100 text-xs">
          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <span className="text-slate-500 font-medium">Product Name</span>
            <span className="sm:col-span-2 font-semibold text-slate-900">{detectedName}</span>
          </div>

          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <span className="text-slate-500 font-medium">Manufacturer / Packer</span>
            <span className="sm:col-span-2 font-semibold text-slate-900">{detectedManufacturer}</span>
          </div>

          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <span className="text-slate-500 font-medium">Net Quantity</span>
            <span className="sm:col-span-2 font-semibold text-slate-900">{detectedNetQty}</span>
          </div>

          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <span className="text-slate-500 font-medium">MRP</span>
            <span className="sm:col-span-2 font-semibold text-slate-900">{detectedMrp}</span>
          </div>

          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <span className="text-slate-500 font-medium">Manufacturing / Packing Date</span>
            <span className="sm:col-span-2 font-semibold text-slate-900">{detectedMfgDate}</span>
          </div>

          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <span className="text-slate-500 font-medium">Best Before / Use By</span>
            <span className="sm:col-span-2 font-semibold text-slate-900">{detectedBestBefore}</span>
          </div>

          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <span className="text-slate-500 font-medium">Consumer Care</span>
            <span className="sm:col-span-2 font-semibold text-slate-900">{detectedConsumerCare}</span>
          </div>

          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <span className="text-slate-500 font-medium">Country of Origin</span>
            <span className="sm:col-span-2 font-semibold text-slate-900">{detectedOrigin}</span>
          </div>
        </div>
      </div>

      {/* ── Section 7 & 9: Label Review & Issues Found ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-sm font-bold text-[#102a43]">
            Label Review
          </h2>
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded border ${
            isPass
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}>
            {isPass ? 'PASS' : 'REVIEW'}
          </span>
        </div>

        {issues.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800">
              Issues Found
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {issues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold leading-tight">&bull;</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/50 p-3 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All mandatory declarations detected and verified.</span>
          </div>
        )}
      </div>

      {/* ── Uploaded Images Preview (if present) ── */}
      {images.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Uploaded Product Images ({images.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div key={i} className="bg-slate-50 rounded-md border border-slate-200 p-2 text-center">
                <div className="h-28 flex items-center justify-center bg-white rounded overflow-hidden">
                  <img src={img.previewUrl} alt={img.name} className="max-h-full max-w-full object-contain" />
                </div>
                <span className="text-[10px] text-slate-600 font-medium truncate block mt-1.5" title={img.name}>
                  {img.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom Action & Disclaimer ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Link
            to="/official/company"
            className="text-xs font-semibold text-slate-600 hover:text-[#102a43]"
          >
            &larr; Back to Dashboard
          </Link>

          <Link
            to="/official/company/scan"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#102a43] hover:bg-[#1e3a5f] text-white text-xs font-bold transition-colors shadow-2xs"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan Another Product</span>
          </Link>
        </div>

        <div className="text-center text-[11px] text-slate-500 pt-2">
          AI-assisted analysis is preliminary and should be verified against applicable requirements.
        </div>
      </div>
    </div>
  );
};

export default CompanyCompliancePreview;

