import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, FileText, AlertTriangle, AlertCircle, 
  CheckCircle2, ShieldAlert, Package, Camera, Lock
} from 'lucide-react';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

const ScanResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const isCitizen = isAuthenticated && role === 'CITIZEN';

  const scanData = location.state;

  if (!scanData || (!scanData.scanResult && !scanData.backendMetadata)) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-lg border border-slate-300 p-8 shadow-xs">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800 mb-1">No Scan Results Available</h2>
          <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
            Please upload a product label photograph on the scan page to generate an AI compliance screening.
          </p>
          <Button to="/scan" variant="primary" className="text-xs px-5 py-2 font-bold bg-[#0f2942]">
            Go to Scan Page
          </Button>
        </div>
      </div>
    );
  }

  const { productName: passedName, brandName: passedBrand, images = [], scanResult } = scanData;
  const liveResult = scanResult || scanData.backendMetadata || {};
  const extracted = liveResult.extracted || {};
  const compliance = liveResult.compliance || {};
  const findings = compliance.findings || [];

  const productName = extracted.product_name || passedName || 'Packaged Commodity';
  const manufacturer = extracted.manufacturer_or_packer || passedBrand || 'Not detected';
  const netQuantity = extracted.net_quantity || 'Not detected';
  const mrp = extracted.mrp != null && extracted.mrp !== '' ? (String(extracted.mrp).startsWith('₹') ? extracted.mrp : `₹${extracted.mrp}`) : 'Not detected';
  const mfgDate = extracted.manufacturing_or_packing_date || 'Not detected';
  const bestBefore = extracted.best_before_or_use_by || 'Not detected';

  // Build standard 6 declarations checklist
  const declarationsList = [
    {
      field: 'Product / Generic Name',
      detectedValue: extracted.product_name || 'Not detected',
      status: extracted.product_name ? 'PASS' : 'REVIEW',
      rule: 'Rule 6(1)(a)',
    },
    {
      field: 'Manufacturer / Packer Name & Address',
      detectedValue: extracted.manufacturer_or_packer || 'Not detected',
      status: extracted.manufacturer_or_packer ? 'PASS' : 'REVIEW',
      rule: 'Rule 6(1)(d)',
    },
    {
      field: 'Net Quantity',
      detectedValue: extracted.net_quantity || 'Not detected',
      status: extracted.net_quantity ? 'PASS' : 'NOT DETECTED',
      rule: 'Rule 6(1)(b) & Rule 12',
    },
    {
      field: 'Maximum Retail Price (MRP)',
      detectedValue: mrp,
      status: mrp !== 'Not detected' ? 'PASS' : 'NOT DETECTED',
      rule: 'Rule 6(1)(e)',
    },
    {
      field: 'Month & Year of Manufacture / Packing',
      detectedValue: mfgDate,
      status: mfgDate !== 'Not detected' ? 'PASS' : 'REVIEW',
      rule: 'Rule 6(1)(c)',
    },
    {
      field: 'Best Before / Use By Date',
      detectedValue: bestBefore,
      status: bestBefore !== 'Not detected' ? 'PASS' : 'REVIEW',
      rule: 'Rule 6(1)(c)',
    },
  ];

  // Map any specific findings returned by the compliance engine
  const mappedDeclarations = declarationsList.map(item => {
    const matchedFinding = findings.find(f => 
      (f.field || '').toLowerCase().includes(item.field.toLowerCase()) ||
      item.field.toLowerCase().includes((f.field || '').toLowerCase())
    );
    if (matchedFinding) {
      return {
        ...item,
        status: matchedFinding.status || item.status,
        note: matchedFinding.message || matchedFinding.notes,
      };
    }
    return item;
  });

  const handleReportIssue = () => {
    navigate('/complaint', {
      state: {
        ...scanData,
        productName,
        brandName: manufacturer,
        extractedSummary: {
          product_name: productName,
          manufacturer_or_packer: manufacturer,
          net_quantity: netQuantity,
          mrp,
          manufacturing_or_packing_date: mfgDate,
          best_before_or_use_by: bestBefore,
        },
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-6 pt-2">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/scan"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#0f2942] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Scan Another Product</span>
        </Link>
        <span className="text-xs font-bold text-[#0f2942] uppercase tracking-wider">
          Legal Metrology Assessment
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
          Scan Screening Result
        </div>
        <h1 className="text-2xl font-black text-[#0f2942] tracking-tight">
          {productName}
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Preliminary compliance screening against Legal Metrology (Packaged Commodities) Rules, 2011.
        </p>
      </div>

      {/* PRODUCT INFORMATION SECTION */}
      <section className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#0f2942]" />
            Product Information
          </h2>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
            Detected from Label
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Product Name</span>
            <span className="font-bold text-slate-900">{productName}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Manufacturer / Packer</span>
            <span className="font-semibold text-slate-900">{manufacturer}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Net Quantity</span>
            <span className="font-semibold text-slate-900">{netQuantity}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Maximum Retail Price (MRP)</span>
            <span className="font-mono font-bold text-slate-900">{mrp}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Manufacturing / Packing Date</span>
            <span className="font-semibold text-slate-900">{mfgDate}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Best Before / Use By</span>
            <span className="font-semibold text-slate-900">{bestBefore}</span>
          </div>
        </div>
      </section>

      {/* AI FINDINGS SECTION */}
      <section className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0f2942]" />
              AI Findings
            </h2>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Preliminary Check
            </span>
          </div>
          {/* Prominent disclaimer required by Part 5 */}
          <p className="text-xs text-slate-600 italic mt-1 font-medium">
            "AI analysis is preliminary and should not be treated as a final legal determination."
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {mappedDeclarations.map((item, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-slate-50 transition-colors">
              <div className="flex-1">
                <div className="font-bold text-slate-900">{item.field}</div>
                <div className="text-slate-600 font-mono text-[11px] mt-0.5">
                  <span className="text-slate-400 font-sans mr-1">Detected:</span>
                  {item.detectedValue}
                </div>
                {item.note && (
                  <div className="text-[11px] text-slate-500 mt-1">{item.note}</div>
                )}
              </div>
              <StatusBadge status={item.status} size="small" />
            </div>
          ))}
        </div>
      </section>

      {/* SUBMITTED EVIDENCE PREVIEW */}
      {images.length > 0 && (
        <section className="bg-white rounded-lg border border-slate-300 p-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#0f2942]" />
            Uploaded Label Photos ({images.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div key={i} className="bg-slate-50 rounded border border-slate-200 overflow-hidden text-center p-1.5">
                <div className="h-24 flex items-center justify-center bg-white rounded">
                  <img src={img.previewUrl} alt={img.name} className="max-h-full max-w-full object-contain" />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold truncate block mt-1">
                  {img.category || `Photo ${i + 1}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ACTIONS: REPORT THIS ISSUE */}
      <div className="p-5 bg-slate-50 rounded-lg border border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Next Action
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            If you suspect non-compliance, you can lodge an official grievance for Inspector verification.
          </p>
        </div>

        <div className="flex gap-2.5 w-full sm:w-auto">
          <Button to="/scan" variant="secondary" className="w-full sm:w-auto text-xs px-4 py-2.5 font-semibold">
            Scan Another
          </Button>

          {isCitizen ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleReportIssue}
              className="w-full sm:w-auto text-xs px-5 py-2.5 font-bold bg-[#0f2942] hover:bg-[#183e63] shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
              Report This Issue
            </Button>
          ) : (
            <Button
              to="/citizen/login"
              variant="primary"
              className="w-full sm:w-auto text-xs px-5 py-2.5 font-bold bg-[#0f2942] hover:bg-[#183e63] shadow-xs"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Login to Report Issue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanResult;
