import { X, Loader, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import type { Database } from '../lib/database.types';

type SourceTemplate = Database['public']['Tables']['source_templates']['Row'];

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceAdded: () => void;
}

const DEFAULT_CONTEXT = `Job Sources Configuration

GROUP A - Low Friction (RSS/Simple Scraping):
✓ Working Nomads Jobs (mscraper/working-nomads-jobs-scraper)
✓ Remote.com Jobs (getdataforme/remote-com-job-scraper)

GROUP B - Browser Rendering (Requires Proxies):
✓ Wellfound Jobs (mscraper/wellfound-jobs-scraper)
✓ Wellfound Advanced (saswave/advanced-wellfound-companies-jobs-scraper)

Filtering Applied:
1. Hourly Contracts:
   - Min rate: $18/hr
   - Payment verified & 3+ star rating
   - Types: Part-time, Full-time, Contract-to-hire

2. OTE Contracts:
   - Range: $50k - $110k
   - Company size: <100 employees

Locations: US, Canada, Australia, UK, South Africa only

Fallback: BrowserUse API for failed scrapers (uses BROWSERUSE_API_SECRET)`;

export function AddSourceModal({ isOpen, onClose, onSourceAdded }: AddSourceModalProps) {
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [templates, setTemplates] = useState<SourceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const { data } = await supabase
        .from('source_templates')
        .select('*')
        .order('is_default', { ascending: false });

      if (data) {
        setTemplates(data);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleAddSources = async () => {
    setError('');
    setIsLoading(true);
    setProgress('Adding all sources...');

    try {
      const sources = templates.map(template => ({
        name: template.name,
        url: template.url,
        scraperType: template.scraper_type,
        config: template.config_json,
        templateId: template.id,
      }));

      const result = await api.createBulkSources(sources);
      setProgress(`Successfully added ${result.successful} of ${result.total} sources!`);

      setTimeout(() => {
        onSourceAdded();
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add sources');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setContext(DEFAULT_CONTEXT);
    setError('');
    setProgress('');
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Configure Job Sources</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!isLoading ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">How it works:</p>
                  <p>
                    Edit the context below to match your requirements. When you click "Add All Sources",
                    we'll automatically set up scrapers for all job boards that match your criteria.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Search Context
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={16}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Describe your job search criteria..."
                />
                <p className="mt-2 text-xs text-gray-600">
                  This context will be saved and used to configure all job sources automatically.
                </p>
              </div>

              {templates.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Available Sources ({templates.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-700">{template.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-gray-600">
                    All sources will be added and configured based on your context.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleAddSources}
                disabled={templates.length === 0}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Add All {templates.length} Sources
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 text-center">{progress}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
