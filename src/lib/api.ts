const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export interface ActorRecommendation {
  id: string;
  name: string;
  title: string;
  description: string;
  username: string;
  pricing: string;
  stats: {
    totalRuns?: number;
    avgRunTime?: string;
  };
  score: number;
}

export interface DiscoverResponse {
  recommendations: ActorRecommendation[];
  message?: string;
  fallback?: ActorRecommendation;
}

export const api = {
  async discoverScraper(url: string): Promise<DiscoverResponse> {
    const response = await fetch(`${API_BASE}/discover-scraper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error('Failed to discover scraper');
    }

    return response.json();
  },

  async runScraper(sourceId: string): Promise<{ success: boolean; jobsFound: number; jobsInserted: number }> {
    const response = await fetch(`${API_BASE}/run-scraper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sourceId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to run scraper');
    }

    return response.json();
  },

  async getSources() {
    const response = await fetch(`${API_BASE}/sources`);
    if (!response.ok) {
      throw new Error('Failed to fetch sources');
    }
    return response.json();
  },

  async createSource(data: { name: string; url: string; scraperType: string; config: any; templateId?: string }) {
    const response = await fetch(`${API_BASE}/sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create source');
    }

    return response.json();
  },

  async createBulkSources(sources: Array<{ name: string; url: string; scraperType: string; config: any; templateId?: string }>) {
    const results = await Promise.allSettled(
      sources.map(source => this.createSource(source))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { successful, failed, total: sources.length };
  },

  async deleteSource(sourceId: string) {
    const response = await fetch(`${API_BASE}/sources/${sourceId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete source');
    }

    return response.json();
  },

  async getJobs(filters?: {
    locations?: string[];
    oteMin?: number;
    oteMax?: number;
    tags?: string[];
    sourceId?: string;
  }) {
    const params = new URLSearchParams();

    if (filters?.locations?.length) {
      params.append('locations', filters.locations.join(','));
    }
    if (filters?.oteMin) {
      params.append('oteMin', filters.oteMin.toString());
    }
    if (filters?.oteMax) {
      params.append('oteMax', filters.oteMax.toString());
    }
    if (filters?.tags?.length) {
      params.append('tags', filters.tags.join(','));
    }
    if (filters?.sourceId) {
      params.append('sourceId', filters.sourceId);
    }

    const response = await fetch(`${API_BASE}/jobs?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch jobs');
    }

    return response.json();
  },
};
