import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { JobsTable } from './components/JobsTable';
import { SourcesTray } from './components/SourcesTray';
import { AddSourceModal } from './components/AddSourceModal';
import { ScrapeLogsModal } from './components/ScrapeLogsModal';
import { supabase } from './lib/supabase';
import { api } from './lib/api';
import { exportToCSV } from './utils/export';
import type { Database } from './lib/database.types';
import { Rocket } from 'lucide-react';

type Job = Database['public']['Tables']['jobs']['Row'];
type Source = Database['public']['Tables']['sources']['Row'];

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedSourceName, setSelectedSourceName] = useState<string>('');
  const [runningSources, setRunningSources] = useState<Set<string>>(new Set());

  const [contractType, setContractType] = useState<'all' | 'hourly' | 'ote'>('all');
  const [oteMin, setOteMin] = useState(50);
  const [oteMax, setOteMax] = useState(110);
  const [hourlyMin, setHourlyMin] = useState(18);
  const [searchTerm, setSearchTerm] = useState('');

  const loadSources = async () => {
    try {
      const data = await api.getSources();
      setSources(data);
    } catch (error) {
      console.error('Failed to load sources:', error);
    }
  };

  const loadJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const data = await api.getJobs({
        oteMin,
        oteMax,
      });
      setJobs(data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    loadSources();
    loadJobs();
  }, []);

  useEffect(() => {
    loadJobs();
  }, [oteMin, oteMax]);

  useEffect(() => {
    const jobsChannel = supabase
      .channel('jobs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
        },
        () => {
          loadJobs();
        }
      )
      .subscribe();

    const sourcesChannel = supabase
      .channel('sources-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sources',
        },
        () => {
          loadSources();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(sourcesChannel);
    };
  }, []);

  const handleRunSource = async (sourceId: string) => {
    setRunningSources((prev) => new Set(prev).add(sourceId));

    try {
      await api.runScraper(sourceId);
    } catch (error) {
      console.error('Failed to run scraper:', error);
    } finally {
      setRunningSources((prev) => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
      await loadSources();
      await loadJobs();
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await api.deleteSource(sourceId);
      await loadSources();
      await loadJobs();
    } catch (error) {
      console.error('Failed to delete source:', error);
    }
  };

  const handleViewLogs = (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (source) {
      setSelectedSourceId(sourceId);
      setSelectedSourceName(source.name);
      setIsLogsModalOpen(true);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (contractType !== 'all' && job.contract_type !== contractType) {
      return false;
    }

    if (contractType === 'hourly' && job.hourly_rate && job.hourly_rate < hourlyMin) {
      return false;
    }

    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    const matchesTitle = job.title.toLowerCase().includes(search);
    const matchesCompany = job.company.toLowerCase().includes(search);
    const matchesTags = job.tags.some((tag) => tag.toLowerCase().includes(search));

    return matchesTitle || matchesCompany || matchesTags;
  });

  const hasAnySources = sources.length > 0;

  const handleExportCSV = () => {
    exportToCSV(filteredJobs, `contract-curator-jobs-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        onAddSource={() => setIsModalOpen(true)}
        onExport={handleExportCSV}
        hasJobs={filteredJobs.length > 0}
      />

      {hasAnySources ? (
        <>
          <FilterBar
            contractType={contractType}
            onContractTypeChange={setContractType}
            oteMin={oteMin}
            oteMax={oteMax}
            onOteMinChange={setOteMin}
            onOteMaxChange={setOteMax}
            hourlyMin={hourlyMin}
            onHourlyMinChange={setHourlyMin}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <JobsTable jobs={filteredJobs} isLoading={isLoadingJobs} />
          </main>

          <SourcesTray
            sources={sources}
            onRunSource={handleRunSource}
            onDeleteSource={handleDeleteSource}
            onViewLogs={handleViewLogs}
            runningSources={runningSources}
          />
        </>
      ) : (
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Rocket className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Welcome to Contract Curator
            </h2>
            <p className="text-gray-600 mb-6">
              Start by adding job sources. We support hourly contracts (Upwork, Freelancer)
              and OTE positions (Wellfound, YC, RemoteRocketShip). All sources are pre-configured
              and ready to go.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Your First Source
            </button>
          </div>
        </main>
      )}

      <AddSourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSourceAdded={() => {
          loadSources();
          loadJobs();
        }}
      />

      <ScrapeLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        sourceId={selectedSourceId}
        sourceName={selectedSourceName}
      />
    </div>
  );
}

export default App;
