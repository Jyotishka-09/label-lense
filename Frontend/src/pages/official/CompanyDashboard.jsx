import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanLine, Upload, ArrowRight, Eye, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const COMPANY_SCANS_KEY = 'label_lens_company_scans';

/**
 * CompanyDashboard
 * ----------------
 * Simplified Company Self-Assessment Dashboard.
 * Mental model: UPLOAD PRODUCT -> SCAN LABEL -> VIEW ANALYSIS -> FIX ISSUES -> RESCAN
 */
const CompanyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load ONLY real authenticated scans from local storage
  const [recentScans, setRecentScans] = useState(() => {
    try {
      const stored = localStorage.getItem(COMPANY_SCANS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load company scan history:', e);
    }
    return [];
  });

  const handleQuickUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // Redirect to scan page with files handled or prompt
    navigate('/official/company/scan');
  };

  const handleViewScan = (scan) => {
    if (scan.previewState) {
      navigate('/official/company/preview', { state: scan.previewState });
    } else {
      // Reconstruct minimal preview state if old format
      navigate('/official/company/preview', {
        state: {
          productName: scan.productName,
          brandName: scan.brandName || user?.name || 'Company',
          category: scan.category || 'Packaged Commodity',
          skuCode: scan.sku || '',
          images: scan.images || [],
          scanResult: scan.scanResult || {
            extracted: {
              product_name: scan.productName,
              manufacturer_or_packer: scan.brandName || user?.name,
              net_quantity: scan.netQuantity || 'Not detected',
              mrp: scan.mrp || 'Not detected',
              manufacturing_or_packing_date: scan.mfgDate || 'Not detected',
              best_before_or_use_by: scan.bestBefore || 'Not detected',
              consumer_care: scan.consumerCare || 'Not detected',
              country_of_origin: 'India',
            },
            compliance: {
              overall_status: scan.status === 'PASS' ? 'COMPLIANT' : 'NON_COMPLIANT',
            }
          },
          auditRecord: scan,
          timestamp: scan.timestamp ? new Date(scan.timestamp).getTime() : Date.now(),
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Section 3: Simplified Page Introduction ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#102a43] tracking-tight">
            Company Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Check your product label before market launch.
          </p>
        </div>

        <Link
          to="/official/company/scan"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#102a43] hover:bg-[#1e3a5f] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-2xs"
        >
          <ScanLine className="w-4 h-4" />
          <span>Scan Product</span>
        </Link>
      </div>

      {/* ── Section 5 & 13: Main Feature — Scan Your Product Card ── */}
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#102a43]">
            Scan Your Product
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Upload images of your product label to check packaging declarations before printing or distribution.
          </p>
        </div>

        <div className="pt-2 pb-2">
          <Link
            to="/official/company/scan"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Images</span>
          </Link>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="text-xs font-medium text-slate-700">
            Front &bull; Back &bull; Side &bull; Date/MRP panel
          </div>
          <div className="text-[11px] text-slate-400">
            You can upload multiple images of the same product.
          </div>
        </div>
      </div>

      {/* ── Section 10 & 13: Recent Scans ── */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#102a43]">
            Recent Scans
          </h2>
          {recentScans.length > 0 && (
            <span className="text-xs text-slate-500 font-mono">
              {recentScans.length} scan{recentScans.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {recentScans.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-600">
              No product scans yet.
            </p>
            <p className="text-[11px] text-slate-400">
              Upload packaging images to start your first self-assessment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-6">Product</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentScans.map((scan, idx) => {
                  const isPass = scan.status === 'PASS';
                  const dateStr = scan.timestamp 
                    ? new Date(scan.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Recent';

                  return (
                    <tr key={scan.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-6 font-medium text-slate-900">
                        <div className="truncate max-w-xs sm:max-w-md">
                          {scan.productName || 'Packaged Commodity'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isPass
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {isPass ? 'PASS' : 'REVIEW'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleViewScan(scan)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#102a43] hover:text-emerald-700 hover:underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 8 & 13: Footer Disclaimer Note ── */}
      <div className="text-center text-[11px] text-slate-500 pt-2 pb-6">
        AI-assisted analysis is preliminary and should be verified against applicable requirements.
      </div>
    </div>
  );
};

export default CompanyDashboard;

