import { ChevronDown, ChevronUp, Database } from 'lucide-react';
import { useState } from 'react';
import { SourceCard } from './SourceCard';
import type { Database as DB } from '../lib/database.types';

type Source = DB['public']['Tables']['sources']['Row'];

interface SourcesTrayProps {
  sources: Source[];
  onRunSource: (sourceId: string) => void;
  onDeleteSource: (sourceId: string) => void;
  runningSources: Set<string>;
}

export function SourcesTray({ sources, onRunSource, onDeleteSource, runningSources }: SourcesTrayProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">
              Sources ({sources.length})
            </h3>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {isExpanded && (
          <div className="pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                onRun={onRunSource}
                onDelete={onDeleteSource}
                isRunning={runningSources.has(source.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
