import { Clock, Search, Filter } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';

const History = () => {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Inspection History</h1>
          <p className="mt-1 text-gray-600">Review past scans and compliance reports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="px-3" disabled>
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        {/* Simple toolbar placeholder */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex gap-4">
          <div className="relative flex-1 max-w-md hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              disabled
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search history (disabled)"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="p-8 md:p-16">
          <EmptyState
            icon={Clock}
            title="No inspections yet"
            description="Completed inspections and compliance reports will appear here."
            action={
              <Button to="/scan" variant="primary">
                Scan a Product
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default History;