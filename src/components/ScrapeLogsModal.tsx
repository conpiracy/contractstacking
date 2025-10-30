import { X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type ScrapeLog = Database['public']['Tables']['scrape_logs']['Row'];

interface ScrapeLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceId: string;
  sourceName: string;
}

export function ScrapeLogsModal({ isOpen, onClose, sourceId, sourceName }: ScrapeLogsModalProps) {
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && sourceId) {
      loadLogs();
    }
  }, [isOpen, sourceId]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scrape_logs')
        .select('*')
        .eq('source_id', sourceId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Scrape Logs</h2>
            <p className="text-sm text-gray-600 mt-1">{sourceName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No scrape logs found for this source.</p>
              <p className="text-sm text-gray-500 mt-2">Run the scraper to see logs here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-lg p-4 ${getStatusColor(log.status)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="font-semibold text-gray-900 capitalize">
                        {log.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-600">Jobs Found:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {log.jobs_found || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Jobs Inserted:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {log.jobs_inserted || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {log.started_at && log.completed_at
                          ? `${Math.round(
                              (new Date(log.completed_at).getTime() -
                                new Date(log.started_at).getTime()) /
                                1000
                            )}s`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {log.error_message && (
                    <div className="mb-3 p-3 bg-red-100 border border-red-200 rounded text-sm text-red-800">
                      <strong>Error:</strong> {log.error_message}
                    </div>
                  )}

                  {log.log_entries && log.log_entries.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded p-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        Execution Log:
                      </h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {log.log_entries.map((entry, idx) => (
                          <div
                            key={idx}
                            className="text-xs font-mono text-gray-700 py-1 border-b border-gray-100 last:border-0"
                          >
                            <span className="text-gray-400 mr-2">{idx + 1}.</span>
                            {entry}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
