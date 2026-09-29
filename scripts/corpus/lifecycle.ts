import { parseHTML } from 'linkedom';

// AWS lists services it no longer offers to new customers on three official
// pages (Maintenance, Sunset, Full Shutdown); their first column is the name.
export const AWS_LIFECYCLE_PAGES = [
  'https://docs.aws.amazon.com/general/latest/gr/maintenance_services.html',
  'https://docs.aws.amazon.com/general/latest/gr/sunset_services.html',
  'https://docs.aws.amazon.com/general/latest/gr/full_shutdown_services.html',
];

function comparable(name: string): string {
  return name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function retiredServiceNames(pages: readonly string[]): Set<string> {
  const names = new Set<string>();
  for (const html of pages) {
    const rows = [...parseHTML(html).document.querySelectorAll('#main-col-body table tr')];
    if (rows.length === 0) throw new Error('AWS lifecycle page has no service table; the page layout probably changed');
    for (const row of rows) {
      const firstCell = row.querySelector('td');
      if (firstCell?.textContent) names.add(comparable(firstCell.textContent));
    }
  }
  return names;
}

export function isRetired(title: string, retiredNames: ReadonlySet<string>): boolean {
  return retiredNames.has(comparable(title));
}
