import { describe, expect, it } from 'vitest';
import { awsGuideRoots, awsLandingUrl, k8sConceptPages } from '../scripts/corpus/discover.ts';

const AWS_INDEX = `<?xml version="1.0"?><sitemapindex>
<sitemap><loc>https://docs.aws.amazon.com/lambda/latest/dg/sitemap.xml</loc></sitemap>
<sitemap><loc>https://docs.aws.amazon.com/lambda/latest/api/sitemap.xml</loc></sitemap>
<sitemap><loc>https://docs.aws.amazon.com/AmazonS3/latest/developerguide/sitemap.xml</loc></sitemap>
<sitemap><loc>https://docs.aws.amazon.com/AmazonS3/latest/userguide/sitemap.xml</loc></sitemap>
<sitemap><loc>https://docs.aws.amazon.com/zh_cn/AmazonS3/latest/userguide/sitemap.xml</loc></sitemap>
<sitemap><loc>https://docs.aws.amazon.com/AmazonCloudFront/2008-06-30/DeveloperGuide/sitemap.xml</loc></sitemap>
<sitemap><loc>https://docs.aws.amazon.com/IAM/latest/UserGuide/sitemap.xml</loc></sitemap>
</sitemapindex>`;

const K8S_SITEMAP = `<?xml version="1.0"?><urlset>
<url><loc>https://kubernetes.io/docs/concepts/</loc></url>
<url><loc>https://kubernetes.io/docs/concepts/workloads/pods/</loc></url>
<url><loc>https://kubernetes.io/docs/concepts/services-networking/service/</loc></url>
<url><loc>https://kubernetes.io/docs/tasks/run-application/</loc></url>
<url><loc>https://kubernetes.io/zh-cn/docs/concepts/workloads/pods/</loc></url>
</urlset>`;

describe('awsGuideRoots', () => {
  it('given the sitemap index, returns one English user or developer guide per service, preferring the user guide', () => {
    expect(awsGuideRoots(AWS_INDEX)).toEqual([
      { id: 'amazons3', rootUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/' },
      { id: 'iam', rootUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/' },
      { id: 'lambda', rootUrl: 'https://docs.aws.amazon.com/lambda/latest/dg/' },
    ]);
  });
});

describe('awsLandingUrl', () => {
  it('given a guide root with a refresh redirect, resolves the landing page', () => {
    const rootUrl = 'https://docs.aws.amazon.com/eventbridge/latest/userguide/';
    const html = '<html><head><meta http-equiv="refresh" content="0;URL=eb-what-is.html"></head></html>';
    expect(awsLandingUrl(rootUrl, { url: rootUrl, html })).toBe(
      'https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html',
    );
  });

  it('given a guide root that redirects over HTTP, takes the page it landed on', () => {
    const rootUrl = 'https://docs.aws.amazon.com/step-functions/latest/dg/';
    const landed = 'https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html';
    expect(awsLandingUrl(rootUrl, { url: landed, html: '<html><title>What is Step Functions?</title></html>' })).toBe(landed);
  });

  it('given a redirect that leaves the documentation site, throws', () => {
    const rootUrl = 'https://docs.aws.amazon.com/x/latest/userguide/';
    expect(() => awsLandingUrl(rootUrl, { url: 'https://example.com/landing.html', html: '' })).toThrow('leaves');
    const html = '<meta http-equiv="refresh" content="0;URL=https://example.com/x.html">';
    expect(() => awsLandingUrl(rootUrl, { url: rootUrl, html })).toThrow('leaves');
  });

  it('given a guide root without any redirect, throws', () => {
    const rootUrl = 'https://docs.aws.amazon.com/x/latest/userguide/';
    expect(() => awsLandingUrl(rootUrl, { url: rootUrl, html: '<html></html>' })).toThrow('redirect');
  });
});

describe('k8sConceptPages', () => {
  it('given the sitemap, returns English concept pages with ids from their path', () => {
    expect(k8sConceptPages(K8S_SITEMAP)).toEqual([
      { id: 'services-networking-service', docsUrl: 'https://kubernetes.io/docs/concepts/services-networking/service/' },
      { id: 'workloads-pods', docsUrl: 'https://kubernetes.io/docs/concepts/workloads/pods/' },
    ]);
  });
});
