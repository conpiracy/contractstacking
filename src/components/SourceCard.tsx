import { Play, Trash2, Globe, CheckCircle, XCircle, Loader, Clock } from 'lucide-react';
import { useState } from 'react';
import type { Database } from '../lib/database.types';

type Source = Database['public']['Tables']['sources']['Row'];

interface SourceCardProps {
  source: Source;
  onRun: (sourceId: string) => void;
  onDelete: (sourceId: string) => void;
  isRunning?: boolean;
}

export function SourceCard({ source, onRun, onDelete, isRunning }: SourceCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const getStatusIcon = () => {
    if (isRunning) {
      return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
    }
    switch (source.last_status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (isRunning) return 'Running...';
    return source.last_status.charAt(0).toUpperCase() + source.last_status.slice(1);
  };

  const getStatusColor = () => {
    if (isRunning) return 'bg-blue-50 border-blue-200';
    switch (source.last_status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()} transition-colors`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="bg-white p-2 rounded-lg border border-gray-200">
            <Globe className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">{source.name}</h4>
            <p className="text-sm text-gray-600 truncate">{source.url}</p>
            <div className="flex items-center gap-2 mt-2">
              {getStatusIcon()}
              <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
            </div>
            {source.last_run_at && (
              <p className="text-xs text-gray-500 mt-1">
                Last run: {new Date(source.last_run_at).toLocaleString()}
              </p>
            )}
            {source.last_error && (
              <p className="text-xs text-red-600 mt-1 line-clamp-2">{source.last_error}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onRun(source.id)}
            disabled={isRunning}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Run scraper"
          >
            <Play className="w-4 h-4" />
          </button>
          {showConfirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onDelete(source.id);
                  setShowConfirmDelete(false);
                }}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              disabled={isRunning}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Delete source"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
