import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_LEGAL_WEBSITE_BASE,
  legalDocumentPath,
  transformApiUrlToWebsiteBase,
} from './legalUrls';

test('transformApiUrlToWebsiteBase swaps api. for app. on the production host', () => {
  assert.equal(
    transformApiUrlToWebsiteBase('https://api.snaproad.app'),
    'https://app.snaproad.app',
  );
});

test('transformApiUrlToWebsiteBase preserves a multi-level api subdomain', () => {
  assert.equal(
    transformApiUrlToWebsiteBase('https://api.staging.snaproad.app'),
    'https://app.staging.snaproad.app',
  );
});

test('transformApiUrlToWebsiteBase keeps localhost dev hosts intact', () => {
  assert.equal(
    transformApiUrlToWebsiteBase('http://localhost:8001'),
    'http://localhost:8001',
  );
});

test('transformApiUrlToWebsiteBase keeps non-api subdomains intact', () => {
  assert.equal(
    transformApiUrlToWebsiteBase('https://app.snaproad.app'),
    'https://app.snaproad.app',
  );
});

test('transformApiUrlToWebsiteBase falls back when the input is missing or unparseable', () => {
  assert.equal(transformApiUrlToWebsiteBase(undefined), DEFAULT_LEGAL_WEBSITE_BASE);
  assert.equal(transformApiUrlToWebsiteBase(''), DEFAULT_LEGAL_WEBSITE_BASE);
  assert.equal(transformApiUrlToWebsiteBase('   '), DEFAULT_LEGAL_WEBSITE_BASE);
  assert.equal(transformApiUrlToWebsiteBase('not a url'), DEFAULT_LEGAL_WEBSITE_BASE);
});

test('legalDocumentPath maps slugs to the public website paths', () => {
  assert.equal(legalDocumentPath('terms-of-service'), '/terms');
  assert.equal(legalDocumentPath('privacy-policy'), '/privacy');
});
