import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];

export function exportToCSV(jobs: Job[], filename = 'jobs.csv') {
  const headers = ['Title', 'Company', 'Company Size', 'OTE Min', 'OTE Max', 'Location', 'Tags', 'Apply URL', 'Source'];

  const rows = jobs.map((job) => [
    job.title,
    job.company,
    job.company_size || '',
    job.ote_min || '',
    job.ote_max || '',
    job.location,
    job.tags.join('; '),
    job.apply_url,
    job.source_name,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
