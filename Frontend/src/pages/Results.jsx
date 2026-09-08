import { AlertCircle, CheckCircle, FileText, Package } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';

const Results = () => {
  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Inspection Result</h1>
          <p className="mt-1 text-gray-600">Scan report and compliance analysis.</p>
        </div>
        <Button to="/scan" variant="primary">New Scan</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Product Information Card */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center">
              <Package className="w-5 h-5 mr-2 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Product Info</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 italic text-center py-4">No inspection data available.</p>
            </div>
          </div>
          
          {/* Extracted Information Card */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Extracted Label Text</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 italic text-center py-4">Extracted information will appear here.</p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Compliance Status Card */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Compliance Status</h2>
            </div>
            <div className="p-6 min-h-[150px] flex items-center justify-center">
              <p className="text-sm text-gray-500 italic">Compliance analysis will appear here.</p>
            </div>
          </div>

          {/* Violations Card */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Violations</h2>
            </div>
            <div className="p-6 min-h-[200px] flex items-center justify-center">
               <p className="text-sm text-gray-500 italic">Detected violations will appear here.</p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Results;