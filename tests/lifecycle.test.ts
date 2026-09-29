import { describe, expect, it } from 'vitest';
import { isRetired, retiredServiceNames } from '../scripts/corpus/lifecycle.ts';

const SUNSET_PAGE = `<html><body><div id="main-col-body"><h1>Services in Sunset</h1>
<div class="table-container"><table>
<tr><th>Service</th><th>Announcement Date</th><th>End of Support Date</th></tr>
<tr><td>AWS AppMesh</td><td>September 24, 2024</td><td>September 30, 2026</td></tr>
<tr><td>Amazon Pinpoint</td><td>May 20, 2025</td><td>October 30, 2026</td></tr>
<tr><td>Amazon SageMaker AI – Profiler</td><td>June 30, 2026</td><td>June 30, 2027</td></tr>
</table></div></div></body></html>`;

describe('retiredServiceNames', () => {
  it('given the official lifecycle tables, returns the service column', () => {
    expect([...retiredServiceNames([SUNSET_PAGE])]).toEqual(['awsappmesh', 'amazonpinpoint', 'amazonsagemakeraiprofiler']);
  });

  it('given a page without a lifecycle table, throws so a site change is noticed', () => {
    expect(() => retiredServiceNames(['<div id="main-col-body"><p>moved</p></div>'])).toThrow('lifecycle');
  });
});

describe('isRetired', () => {
  const retired = retiredServiceNames([SUNSET_PAGE]);

  it.each([
    ['AWS App Mesh', true],
    ['Amazon Pinpoint', true],
    ['Amazon SageMaker AI', false],
    ['AWS Lambda', false],
  ])('given the article title %s, returns %s', (title, expected) => {
    expect(isRetired(title, retired)).toBe(expected);
  });
});
