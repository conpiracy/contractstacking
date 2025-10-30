import { Rocket, Plus, Download } from 'lucide-react';

interface HeaderProps {
  onAddSource: () => void;
  onExport: () => void;
  hasJobs: boolean;
}

export function Header({ onAddSource, onExport, hasJobs }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contract Curator</h1>
              <p className="text-sm text-gray-600">Hourly contracts & OTE positions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasJobs && (
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
            )}
            <button
              onClick={onAddSource}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Source
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
