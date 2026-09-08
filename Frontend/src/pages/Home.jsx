import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Scan, User, Building2, 
  UploadCloud, Cpu, AlertTriangle, ArrowRight, CheckCircle2
} from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated, role, user } = useAuth();
  const isCitizen = isAuthenticated && role === 'CITIZEN';
  const isInspector = isAuthenticated && role === 'INSPECTOR';
  const isAuthority = isAuthenticated && role === 'AUTHORITY';

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16 pt-4 px-4">
      {/* Official Government Advisory Notice */}
      <div className="bg-slate-100 border border-slate-300 rounded-lg p-3.5 flex items-start gap-3 text-xs text-slate-800 shadow-xs">
        <ShieldCheck className="w-4 h-4 text-[#0f2942] flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-[#0f2942]">Legal Metrology Department &bull; Public Service Portal:</strong>{' '}
          Pre-packaged commodities sold in India must display legible mandatory declarations under the{' '}
          <strong>Legal Metrology (Packaged Commodities) Rules, 2011</strong>. This portal provides AI-assisted preliminary compliance screening and formal grievance lodging.
        </div>
      </div>

      {/* Hero Section */}
      <section className="text-center py-6 md:py-10 space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-[#0f2942] text-xs font-bold uppercase tracking-wider border border-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0f2942]" />
          <span>Department of Consumer Affairs</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-[#0f2942] tracking-tight">
          LABEL LENS
        </h1>

        <p className="text-lg sm:text-xl font-semibold text-slate-800 max-w-2xl mx-auto leading-snug">
          Scan packaged products and identify potential labelling compliance issues.
        </p>

        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Screen consumer goods labels against mandatory statutory declarations including Maximum Retail Price (MRP), Net Quantity, Manufacturer details, and Expiry Dates.
        </p>

        {/* Primary Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
          {isCitizen ? (
            <>
              <Button to="/citizen" variant="primary" className="text-sm px-6 py-3 font-bold bg-[#0f2942] min-w-[200px]">
                <User className="w-4 h-4 mr-2" />
                Citizen Dashboard
              </Button>
              <Button to="/scan" variant="secondary" className="text-sm px-6 py-3 font-semibold min-w-[200px]">
                <Scan className="w-4 h-4 mr-2" />
                Scan a Product
              </Button>
            </>
          ) : isInspector ? (
            <Button to="/official/inspector" variant="primary" className="text-sm px-6 py-3 font-bold bg-[#0f2942] min-w-[220px]">
              <Building2 className="w-4 h-4 mr-2" />
              Inspector Workspace
            </Button>
          ) : isAuthority ? (
            <Button to="/official/authority" variant="primary" className="text-sm px-6 py-3 font-bold bg-[#0f2942] min-w-[220px]">
              <Building2 className="w-4 h-4 mr-2" />
              Authority Dashboard
            </Button>
          ) : (
            <>
              <Button to="/citizen/login" variant="primary" className="text-sm px-6 py-3 font-bold bg-[#0f2942] hover:bg-[#183e63] min-w-[190px] shadow-xs">
                <User className="w-4 h-4 mr-2" />
                Citizen Login
              </Button>
              <Button to="/official/login" variant="secondary" className="text-sm px-6 py-3 font-bold min-w-[190px] border border-slate-300">
                <Building2 className="w-4 h-4 mr-2 text-[#0f2942]" />
                Official Login
              </Button>
            </>
          )}
        </div>

        <p className="text-[11px] text-slate-500 italic mt-2">
          "AI findings are preliminary technical indicators and do not constitute confirmed legal determinations."
        </p>
      </section>

      {/* How It Works — Simple 3-Step Process */}
      <section className="bg-white rounded-lg border border-slate-300 p-6 md:p-8 shadow-xs">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-center mb-6">
          How Label Lens Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-[#0f2942] text-white flex items-center justify-center font-bold text-sm mb-3">
              1
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Scan Product Label</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload 1 to 4 clear photos of the packaged commodity (front display, back panel, MRP, or date stamp).
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-[#0f2942] text-white flex items-center justify-center font-bold text-sm mb-3">
              2
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">AI Compliance Check</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Optical character recognition extracts key declarations and screens against Legal Metrology Rules, 2011.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-[#0f2942] text-white flex items-center justify-center font-bold text-sm mb-3">
              3
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Report Non-Compliance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If discrepancies are identified, lodge an official grievance for field verification by an Inspector.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;