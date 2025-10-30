import { Search } from 'lucide-react';

interface FilterBarProps {
  contractType: 'all' | 'hourly' | 'ote';
  onContractTypeChange: (value: 'all' | 'hourly' | 'ote') => void;
  oteMin: number;
  oteMax: number;
  onOteMinChange: (value: number) => void;
  onOteMaxChange: (value: number) => void;
  hourlyMin: number;
  onHourlyMinChange: (value: number) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function FilterBar({
  contractType,
  onContractTypeChange,
  oteMin,
  oteMax,
  onOteMinChange,
  onOteMaxChange,
  hourlyMin,
  onHourlyMinChange,
  searchTerm,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-[73px] z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, company, or tags..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Contract Type:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => onContractTypeChange('all')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    contractType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => onContractTypeChange('hourly')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    contractType === 'hourly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Hourly
                </button>
                <button
                  onClick={() => onContractTypeChange('ote')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    contractType === 'ote'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  OTE
                </button>
              </div>
            </div>

            {contractType === 'hourly' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Min Hourly:
                </label>
                <input
                  type="number"
                  min="18"
                  max="200"
                  value={hourlyMin}
                  onChange={(e) => onHourlyMinChange(Number(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-sm text-gray-600">/hr</span>
              </div>
            )}

            {contractType === 'ote' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  OTE Range:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="50"
                    max="110"
                    value={oteMin}
                    onChange={(e) => onOteMinChange(Number(e.target.value))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    min="50"
                    max="110"
                    value={oteMax}
                    onChange={(e) => onOteMaxChange(Number(e.target.value))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-sm text-gray-600">k</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
