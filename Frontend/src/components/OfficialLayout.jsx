import { Outlet } from 'react-router-dom';
import OfficialNavbar from './OfficialNavbar';

const OfficialLayout = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <OfficialNavbar />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto py-3 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            Legal Metrology Officer Enforcement Console &bull; Confidential &bull; For Authorized Use Only
          </div>
          <div className="text-[11px] text-slate-400">
            Internal Inspection Framework &bull; SIH26034
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OfficialLayout;
