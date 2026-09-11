import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldAlert, ArrowLeft, MapPin, Package, 
  AlertCircle, CheckCircle2, RefreshCw, Navigation, Edit3 
} from 'lucide-react';
import Button from '../../components/Button';
import { createComplaint } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ISSUE_CATEGORIES = [
  'MRP / Price Discrepancy',
  'Net Quantity Underweight / Missing',
  'Manufacturing / Packing Date Issue',
  'Best Before / Use By Date Issue',
  'Missing Manufacturer / Packer Details',
  'Missing Mandatory Declarations',
  'Consumer Care Details Missing',
  'Country of Origin Missing',
  'Label / Declaration Missing or Unreadable',
  'Other',
];

// Predefined official circle hubs for simple, accurate manual selection
const OFFICIAL_HUBS = [
  { label: 'Fancy Bazaar / Panbazaar, Guwahati (781001)', locality: 'Fancy Bazaar', district: 'Kamrup Metropolitan', state: 'Assam', pincode: '781001', lat: 26.184, lng: 91.745 },
  { label: 'Chandmari / Silpukhuri, Guwahati (781003)', locality: 'Chandmari', district: 'Kamrup Metropolitan', state: 'Assam', pincode: '781003', lat: 26.192, lng: 91.776 },
  { label: 'Christian Basti / G.S. Road, Guwahati (781005)', locality: 'Christian Basti', district: 'Kamrup Metropolitan', state: 'Assam', pincode: '781005', lat: 26.155, lng: 91.778 },
  { label: 'Six Mile / Dispur, Guwahati (781022)', locality: 'Six Mile', district: 'Kamrup Metropolitan', state: 'Assam', pincode: '781022', lat: 26.136, lng: 91.802 },
  { label: 'Beltola / Basistha, Guwahati (781028)', locality: 'Beltola', district: 'Kamrup Metropolitan', state: 'Assam', pincode: '781028', lat: 26.118, lng: 91.792 },
  { label: 'Tezpur Bazaar, Sonitpur (784001)', locality: 'Tezpur Bazaar', district: 'Sonitpur', state: 'Assam', pincode: '784001', lat: 26.633, lng: 92.792 },
  { label: 'Nagaon Town Market, Nagaon (782001)', locality: 'Nagaon Town Market', district: 'Nagaon', state: 'Assam', pincode: '782001', lat: 26.345, lng: 92.684 },
  { label: 'Dibrugarh Central, Dibrugarh (786001)', locality: 'Dibrugarh Central', district: 'Dibrugarh', state: 'Assam', pincode: '786001', lat: 27.472, lng: 94.912 },
  { label: 'Tinsukia Industrial Area, Tinsukia (786125)', locality: 'Tinsukia Industrial Area', district: 'Tinsukia', state: 'Assam', pincode: '786125', lat: 27.502, lng: 95.362 },
  { label: 'Jorhat Commercial Centre, Jorhat (785001)', locality: 'Jorhat Commercial Centre', district: 'Jorhat', state: 'Assam', pincode: '785001', lat: 26.750, lng: 94.220 },
  { label: 'Bongaigaon City, Bongaigaon (783380)', locality: 'Bongaigaon City', district: 'Bongaigaon', state: 'Assam', pincode: '783380', lat: 26.502, lng: 90.553 },
  { label: 'Dhubri Riverport Market, Dhubri (783301)', locality: 'Dhubri Riverport Market', district: 'Dhubri', state: 'Assam', pincode: '783301', lat: 26.020, lng: 89.980 },
  { label: 'Silchar Central / Tarapur, Cachar (788001)', locality: 'Silchar Central', district: 'Cachar', state: 'Assam', pincode: '788001', lat: 24.833, lng: 92.779 },
  { label: 'Silchar Sadar / Rongpur, Cachar (788005)', locality: 'Silchar Sadar', district: 'Cachar', state: 'Assam', pincode: '788005', lat: 24.825, lng: 92.795 },
  { label: 'Karimganj Town Market, Karimganj (788710)', locality: 'Karimganj Town Market', district: 'Karimganj', state: 'Assam', pincode: '788710', lat: 24.868, lng: 92.358 },
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

  // Form states
  const [selectedIssues, setSelectedIssues] = useState([ISSUE_CATEGORIES[0]]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [otherIssueDescription, setOtherIssueDescription] = useState('');
  const [description, setDescription] = useState('');

  const handleToggleIssue = (cat) => {
    setSelectedIssues((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((i) => i !== cat);
      } else {
        return [...prev, cat];
      }
    });
    setError('');
  };
  
  // Location states
  const [locationMode, setLocationMode] = useState(null); // 'gps' | 'manual' | null
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
  
  const [locationData, setLocationData] = useState({
    address: '',
    locality: '',
    district: '',
    state: 'Assam',
    pincode: '',
    latitude: null,
    longitude: null,
  });

  // Manual input fields
  const [manualStoreName, setManualStoreName] = useState('');
  const [manualDistrict, setManualDistrict] = useState('Kamrup Metropolitan');
  const [manualState, setManualState] = useState('Assam');
  const [manualPincode, setManualPincode] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Handler: Use My Current Location ──────────────────────────────────────
  const handleUseCurrentLocation = () => {
    setGpsError('');
    setIsDetectingGps(true);
    setLocationMode('gps');

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Please select location manually.');
      setIsDetectingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        let resolvedAddress = '';
        let resolvedLocality = '';
        let resolvedDistrict = '';
        let resolvedState = 'Assam';
        let resolvedPincode = '';

        // Attempt reverse geocoding via Nominatim with strict timeout
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              resolvedState = data.address.state || 'Assam';
              resolvedDistrict = data.address.state_district || data.address.county || data.address.city || 'Kamrup Metropolitan';
              resolvedLocality = data.address.suburb || data.address.neighbourhood || data.address.town || data.address.village || 'Local Area';
              resolvedPincode = data.address.postcode || '';
              resolvedAddress = `${resolvedLocality}, ${resolvedDistrict}, ${resolvedState}${resolvedPincode ? ` (${resolvedPincode})` : ''}`;
            }
          }
        } catch (e) {
          console.warn('[Complaint] Reverse geocoding failed or timed out:', e.message);
        }

        // Fallback if reverse geocoding was unavailable
        if (!resolvedAddress) {
          resolvedAddress = `GPS Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E), Assam`;
          resolvedDistrict = 'Kamrup Metropolitan';
          resolvedLocality = 'Assam Area';
        }

        setLocationData({
          address: resolvedAddress,
          locality: resolvedLocality,
          district: resolvedDistrict,
          state: resolvedState,
          pincode: resolvedPincode,
          latitude: lat,
          longitude: lng,
        });

        setIsLocationConfirmed(true);
        setIsDetectingGps(false);
      },
      (err) => {
        console.warn('[Complaint] Geolocation error:', err);
        let msg = 'Could not access device location. Please choose "Select Location Manually".';
        if (err.code === 1) msg = 'Location permission was denied. Please choose "Select Location Manually".';
        setGpsError(msg);
        setIsDetectingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Handler: Confirm Manual Location ──────────────────────────────────────
  const handleConfirmManualLocation = (e) => {
    e.preventDefault();
    if (!manualStoreName.trim()) {
      setError('Please provide a store name, landmark, or locality.');
      return;
    }

    const fullAddr = `${manualStoreName.trim()}, ${manualDistrict}, ${manualState}${manualPincode.trim() ? ` (${manualPincode.trim()})` : ''}`;
    
    // Check if matched to a known hub to pull coordinates
    const matchedHub = OFFICIAL_HUBS.find(h => 
      h.pincode === manualPincode.trim() || 
      fullAddr.toLowerCase().includes(h.locality.toLowerCase())
    );

    setLocationData({
      address: fullAddr,
      locality: manualStoreName.trim(),
      district: manualDistrict,
      state: manualState,
      pincode: manualPincode.trim(),
      latitude: matchedHub ? matchedHub.lat : null,
      longitude: matchedHub ? matchedHub.lng : null,
    });

    setIsLocationConfirmed(true);
    setError('');
  };

  // ── Quick Select Official Hub ─────────────────────────────────────────────
  const handleSelectOfficialHub = (hub) => {
    setLocationData({
      address: `${hub.locality}, ${hub.district}, ${hub.state} (${hub.pincode})`,
      locality: hub.locality,
      district: hub.district,
      state: hub.state,
      pincode: hub.pincode,
      latitude: hub.lat,
      longitude: hub.lng,
    });
    setManualStoreName(hub.locality);
    setManualDistrict(hub.district);
    setManualPincode(hub.pincode);
    setIsLocationConfirmed(true);
    setError('');
  };

  const handleResetLocation = () => {
    setIsLocationConfirmed(false);
    setLocationMode(null);
    setGpsError('');
    setError('');
  };

  // ── Form Submission ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Issue selection validation
    if (!selectedIssues || selectedIssues.length === 0) {
      setError('Please select at least one issue.');
      return;
    }

    // PART 2: Location Validation
    if (!isLocationConfirmed || !locationData.address.trim()) {
      setError('Please select the location where the issue was observed.');
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
        
        // Structured Location fields
        location: locationData.address.trim(),
        location_address: locationData.address.trim(),
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        state: locationData.state || 'Assam',
        district: locationData.district || '',
        locality: locationData.locality || '',
        pincode: locationData.pincode || '',

        // Structured Reported Issues
        reportedIssues: selectedIssues,
        issues: selectedIssues,
        otherIssueDescription: selectedIssues.includes('Other') ? otherIssueDescription.trim() : '',
        issueCategory: selectedIssues[0] || 'Other',
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

      {/* Citizen input form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-300 p-6 shadow-xs space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
          Citizen Complaint Details
        </h2>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Select Issues / Conflicts (Multi-Select) */}
        <div className="relative">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
            Select Issues / Conflicts <span className="text-red-600">*</span>
          </label>
          <p className="text-[11px] text-slate-500 mb-2">
            Select one or multiple conflicts/issues you observed on the packaged product.
          </p>

          {/* Multi-Select Dropdown Trigger */}
          <button
            type="button"
            id="issues-dropdown-trigger"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded flex items-center justify-between hover:border-slate-400 focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-left cursor-pointer transition-colors"
          >
            <span className="font-medium text-slate-900 truncate">
              {selectedIssues.length === 0
                ? 'Select one or more issues...'
                : selectedIssues.length === 1
                ? `1 issue selected (${selectedIssues[0]})`
                : `${selectedIssues.length} issues selected`}
            </span>
            <span className="text-slate-500 text-xs ml-2 flex items-center gap-1 font-semibold flex-shrink-0">
              {isDropdownOpen ? '▲' : '▼'}
            </span>
          </button>

          {/* Dropdown Options Menu */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg p-2 max-h-64 overflow-y-auto space-y-1">
                {ISSUE_CATEGORIES.map((cat) => {
                  const checked = selectedIssues.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex items-center gap-2.5 p-2 rounded cursor-pointer text-xs transition-colors ${
                        checked ? 'bg-slate-100 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleIssue(cat)}
                        className="w-4 h-4 rounded text-[#0f2942] border-slate-300 focus:ring-[#0f2942] cursor-pointer"
                      />
                      <span className="flex-1">{cat}</span>
                    </label>
                  );
                })}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center px-1">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedIssues.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(false)}
                    className="text-xs font-bold text-[#0f2942] hover:underline px-2 py-1 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Selected Issues Tags */}
          {selectedIssues.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedIssues.map((issue) => (
                <span
                  key={issue}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-medium"
                >
                  <span>{issue}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleIssue(issue)}
                    className="text-slate-400 hover:text-slate-700 font-bold ml-0.5 cursor-pointer"
                    aria-label={`Remove ${issue}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Conditional "Other" Description Field */}
          {selectedIssues.includes('Other') && (
            <div className="mt-2.5 p-3 bg-slate-50 rounded border border-slate-200">
              <label htmlFor="other-issue-description" className="block text-[11px] font-bold text-slate-700 mb-1">
                Describe the issue <span className="text-slate-500 font-normal">(please explain in your own words)</span>
              </label>
              <input
                id="other-issue-description"
                type="text"
                value={otherIssueDescription}
                onChange={(e) => setOtherIssueDescription(e.target.value)}
                placeholder="Explain the specific conflict or issue..."
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] outline-none text-slate-900"
              />
            </div>
          )}
        </div>

        {/* 2. Complaint Location Section */}
        <div className="space-y-2.5 pt-1">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            Complaint Location <span className="text-red-600">*</span>
          </label>
          <p className="text-[11px] text-slate-500">
            Select the location where the product was purchased or observed for automated inspector dispatch.
          </p>

          {/* Location Confirmed State */}
          {isLocationConfirmed ? (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Complaint location confirmed</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetLocation}
                  className="text-xs text-slate-600 hover:text-slate-900 underline font-semibold cursor-pointer"
                >
                  Change Location
                </button>
              </div>

              <div className="pt-1 text-slate-900 font-semibold flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#0f2942] flex-shrink-0 mt-0.5" />
                <span className="text-xs">{locationData.address}</span>
              </div>

              {locationData.latitude != null && (
                <div className="text-[11px] text-slate-500 font-mono pl-6">
                  Coordinates: {Number(locationData.latitude).toFixed(4)}° N, {Number(locationData.longitude).toFixed(4)}° E
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Option Buttons: GPS vs Manual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isDetectingGps}
                  className="p-3 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isDetectingGps ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#0f2942]" />
                      <span>Detecting Location...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 text-[#0f2942]" />
                      <span>Use My Current Location</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLocationMode('manual');
                    setGpsError('');
                  }}
                  className={`p-3 rounded border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    locationMode === 'manual'
                      ? 'border-[#0f2942] bg-[#0f2942]/5 text-[#0f2942]'
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Edit3 className="w-4 h-4 text-[#0f2942]" />
                  <span>Select Location Manually</span>
                </button>
              </div>

              {gpsError && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{gpsError}</span>
                </div>
              )}

              {/* Manual Selection Form (Visible when 'manual' is clicked or after GPS error) */}
              {(locationMode === 'manual' || gpsError) && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <div className="text-[11px] font-bold uppercase text-slate-600">
                    Select Commercial Circle or Enter Details
                  </div>

                  {/* Official Hub Quick Selection */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Quick Select Known Market / Circle:
                    </label>
                    <select
                      onChange={(e) => {
                        const hub = OFFICIAL_HUBS.find(h => h.label === e.target.value);
                        if (hub) handleSelectOfficialHub(hub);
                      }}
                      defaultValue=""
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] outline-none text-slate-800"
                    >
                      <option value="" disabled>-- Choose a Commercial Hub in Assam --</option>
                      {OFFICIAL_HUBS.map((hub) => (
                        <option key={hub.label} value={hub.label}>{hub.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="text-center text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    — OR ENTER SPECIFIC ADDRESS —
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Store Name / Locality / Street Address <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualStoreName}
                        onChange={(e) => setManualStoreName(e.target.value)}
                        placeholder="e.g. Daily Fresh Mart, Silchar or Fancy Bazaar, Guwahati"
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] outline-none text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          District
                        </label>
                        <input
                          type="text"
                          value={manualDistrict}
                          onChange={(e) => setManualDistrict(e.target.value)}
                          placeholder="e.g. Kamrup Metro, Cachar, Nagaon"
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] outline-none text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Pincode
                        </label>
                        <input
                          type="text"
                          value={manualPincode}
                          onChange={(e) => setManualPincode(e.target.value)}
                          placeholder="e.g. 781001, 788001"
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-mono focus:ring-1 focus:ring-[#0f2942] outline-none text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmManualLocation}
                      className="w-full py-2 px-3 bg-[#0f2942] hover:bg-[#183e63] text-white text-xs font-bold rounded transition-colors shadow-xs cursor-pointer mt-1"
                    >
                      Confirm Complaint Location
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
