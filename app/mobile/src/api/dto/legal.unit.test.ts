import test from 'node:test';
import assert from 'node:assert/strict';

import { LEGAL_BODY_FALLBACK, publicLegalSlugForDoc, selectLegalBody } from './legal';

test('selectLegalBody returns the fallback when the row is missing or empty', () => {
  assert.equal(selectLegalBody(null), LEGAL_BODY_FALLBACK);
  assert.equal(selectLegalBody(undefined), LEGAL_BODY_FALLBACK);
  assert.equal(selectLegalBody({}), LEGAL_BODY_FALLBACK);
});

test('selectLegalBody prefers content_text over content when both are present', () => {
  const out = selectLegalBody({
    content_text: 'Plain readable copy.',
    content: '<p>Plain readable copy.</p>',
  });
  assert.equal(out, 'Plain readable copy.');
});

test('selectLegalBody falls back to content (HTML) when content_text is missing or empty', () => {
  const html = '<p>Hello world.</p>';
  assert.equal(selectLegalBody({ content: html }), html);
  assert.equal(selectLegalBody({ content_text: '   ', content: html }), html);
});

test('selectLegalBody walks legacy aliases when neither content_text nor content is set', () => {
  assert.equal(selectLegalBody({ body: 'legacy body' }), 'legacy body');
  assert.equal(selectLegalBody({ text: 'legacy text' }), 'legacy text');
  assert.equal(selectLegalBody({ description: 'desc only' }), 'desc only');
});

test('selectLegalBody skips fields that are not strings', () => {
  const row = {
    content_text: 42 as unknown as string,
    content: 'fallback string',
  };
  assert.equal(selectLegalBody(row), 'fallback string');
});

test('selectLegalBody returns the fallback when every candidate is empty whitespace', () => {
  const out = selectLegalBody({
    content_text: '',
    content: '   ',
    body: '\n\t',
    text: '',
    description: '',
  });
  assert.equal(out, LEGAL_BODY_FALLBACK);
});

test('publicLegalSlugForDoc maps admin docs by slug, type, and name aliases', () => {
  assert.equal(publicLegalSlugForDoc({ slug: 'privacy-policy', name: 'Privacy', type: 'custom' }), 'privacy-policy');
  assert.equal(publicLegalSlugForDoc({ slug: '', name: 'Terms of Service', type: 'legal' }), 'terms-of-service');
  assert.equal(publicLegalSlugForDoc({ slug: null, name: 'Some Doc', type: 'privacy' }), 'privacy-policy');
  assert.equal(publicLegalSlugForDoc({ slug: 'terms', name: 'Terms', type: 'terms' }), 'terms-of-service');
});

test('publicLegalSlugForDoc excludes cookie and API terms docs from profile settings', () => {
  assert.equal(publicLegalSlugForDoc({ slug: 'cookie-policy', name: 'Cookie Policy', type: 'privacy' }), null);
  assert.equal(publicLegalSlugForDoc({ slug: 'api-terms', name: 'API Terms', type: 'terms' }), null);
});
