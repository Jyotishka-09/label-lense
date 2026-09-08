import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Camera, UploadCloud, RefreshCw, X, AlertCircle, 
  ArrowLeft, CheckCircle2, ShieldCheck, FileText
} from 'lucide-react';
import Button from '../components/Button';
import { scanProductImage } from '../services/api';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const SLOTS_CONFIG = [
  { key: 'front', number: '1', label: 'Front Display Label', note: 'Product name & brand identity' },
  { key: 'back', number: '2', label: 'Back / Information Panel', note: 'Manufacturer address & ingredients' },
  { key: 'mrp', number: '3', label: 'MRP & Net Qty Panel', note: 'Price declaration & metric net weight' },
  { key: 'date', number: '4', label: 'Date & Batch Panel', note: 'Mfg date, expiry date, batch number' },
];

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const Scan = () => {
  const navigate = useNavigate();

  const [slots, setSlots] = useState({
    front: null,
    back: null,
    mrp: null,
    date: null,
  });

  const [productNameHint, setProductNameHint] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRefs = {
    front: useRef(null),
    back: useRef(null),
    mrp: useRef(null),
    date: useRef(null),
  };

  const handleSlotUpload = (slotKey, file) => {
    if (!file) return;
    setError('');

    if (!SUPPORTED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      setError(`"${file.name}" is not a supported image. Please upload JPG, PNG, or WEBP.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`"${file.name}" exceeds the 10 MB size limit.`);
      return;
    }

    const config = SLOTS_CONFIG.find(s => s.key === slotKey);
    const item = {
      file,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      category: config.label,
    };
    setSlots(prev => ({ ...prev, [slotKey]: item }));
  };

  const handleRemoveSlot = (slotKey) => {
    setSlots(prev => ({ ...prev, [slotKey]: null }));
  };

  const handleSubmitScan = async (e) => {
    e.preventDefault();
    setError('');

    const activeSlots = Object.values(slots).filter(Boolean);
    if (activeSlots.length === 0) {
      setError('Please upload at least one image of the product label before analyzing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const filesToScan = activeSlots.map(s => s.file);

      // Call existing multi-image OCR and compliance pipeline
      const scanResponse = await scanProductImage(filesToScan);

      // Navigate to /scan/result with clean scan data
      navigate('/scan/result', {
        state: {
          productName: productNameHint || scanResponse.extracted?.product_name || 'Packaged Commodity',
          brandName: scanResponse.extracted?.manufacturer_or_packer || '',
          images: activeSlots.map(s => ({
            name: s.name,
            category: s.category,
            previewUrl: s.previewUrl,
            size: s.size,
          })),
          scanResult: scanResponse,
          _scanTimestamp: Date.now(),
        },
      });
    } catch (err) {
      console.error('[Scan] Pipeline scan failed:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Analysis pipeline failed. Please check that the AI service is running and try again.'
      );
      setIsSubmitting(false);
    }
  };

  const activeCount = Object.values(slots).filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-6 pt-2">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/citizen"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#0f2942] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="text-xs font-mono text-slate-500 font-semibold">
          {activeCount} of 4 images selected
        </span>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-lg border border-slate-300 p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0f2942] uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Legal Metrology Label Screening</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#0f2942] tracking-tight">
          Scan Product Label
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          Upload 1–4 images of the product label. Our OCR and rule compliance engine will inspect mandatory declarations including MRP, Net Quantity, Dates, and Manufacturer details.
        </p>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmitScan} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* 4 Image Slots */}
        <div className="bg-white rounded-lg border border-slate-300 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Product Label Photographs (1–4)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Click any slot below to choose an image from your device or camera.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Rule 6 Screening
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {SLOTS_CONFIG.map((slotConfig) => {
              const item = slots[slotConfig.key];

              return (
                <div
                  key={slotConfig.key}
                  className={`rounded-lg border-2 transition-all flex flex-col overflow-hidden min-h-[210px] ${
                    item ? 'border-slate-300 bg-white' : 'border-dashed border-slate-300 bg-slate-50/70 hover:border-slate-400'
                  }`}
                >
                  {/* Slot Label */}
                  <div className="px-2.5 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800">
                      {slotConfig.number}. {slotConfig.label}
                    </span>
                    {item && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>

                  {/* Slot Content: Preview vs Upload Action */}
                  {item ? (
                    <div className="p-2 flex flex-col flex-1">
                      <div className="h-28 bg-white rounded border border-slate-200 flex items-center justify-center p-1 mb-2">
                        <img 
                          src={item.previewUrl} 
                          alt={item.name} 
                          className="max-h-full max-w-full object-contain rounded" 
                        />
                      </div>
                      <div className="text-[10px] text-slate-600 truncate mb-2">
                        {item.name} ({formatSize(item.size)})
                      </div>
                      <div className="flex gap-1 mt-auto">
                        <button
                          type="button"
                          onClick={() => inputRefs[slotConfig.key].current?.click()}
                          className="flex-1 py-1 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded border border-slate-300 transition-colors"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(slotConfig.key)}
                          className="flex-1 py-1 px-1 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-[10px] font-semibold rounded border border-slate-300 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        ref={inputRefs[slotConfig.key]}
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleSlotUpload(slotConfig.key, e.target.files[0]);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => inputRefs[slotConfig.key].current?.click()}
                      className="p-5 flex flex-col items-center justify-center flex-1 cursor-pointer hover:bg-slate-100/60 transition-colors text-center"
                    >
                      <Camera className="w-6 h-6 text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-slate-700">
                        Choose Image
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 leading-tight">
                        {slotConfig.note}
                      </span>
                      <input
                        ref={inputRefs[slotConfig.key]}
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleSlotUpload(slotConfig.key, e.target.files[0]);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Optional Commodity Name Hint */}
          <div className="pt-3 border-t border-slate-100">
            <label htmlFor="product-name-hint" className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Product / Commodity Name <span className="text-slate-400 font-normal lowercase">(optional — AI will auto-detect)</span>
            </label>
            <input
              id="product-name-hint"
              type="text"
              value={productNameHint}
              onChange={(e) => setProductNameHint(e.target.value)}
              placeholder="e.g. Pure Ghee 500ml, Butter Cookies 200g"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-slate-800"
            />
          </div>
        </div>

        {/* Action Button: Analyze Product */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 rounded-lg border border-slate-300">
          <span className="text-xs text-slate-500">
            {activeCount > 0 
              ? `Ready to scan ${activeCount} label photo(s) using OCR & compliance rules.`
              : 'Upload at least 1 image to begin compliance analysis.'}
          </span>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || activeCount === 0}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold bg-[#0f2942] hover:bg-[#183e63] shadow-xs"
          >
            {isSubmitting ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analyzing Product...</>
            ) : (
              <><UploadCloud className="w-4 h-4 mr-2" />Analyze Product</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Scan;