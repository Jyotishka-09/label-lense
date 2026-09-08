import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { ShieldCheck, Phone, Info } from 'lucide-react';

const Layout = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <Outlet />
      </main>

      {/* Official Government Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="pt-4 flex flex-col sm:flex-row justify-between items-center text-slate-400 text-[11px] gap-2">
            <div>&copy; {new Date().getFullYear()} Label Lens — Smart India Hackathon Prototype (SIH26034).</div>
            <div className="flex gap-4">
              <span>Standard: LM (PC) Rules, 2011</span>
              <span>Accessibility Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
