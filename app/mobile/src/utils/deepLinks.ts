export function parseParamsFromUrl(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const [basePart, hashPart] = url.split('#');
  const queryIndex = basePart.indexOf('?');
  const queryPart = queryIndex >= 0 ? basePart.slice(queryIndex + 1) : '';

  const ingest = (part: string) => {
    if (!part) return;
    for (const pair of part.split('&')) {
      const [k, v] = pair.split('=');
      if (!k) continue;
      out[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  };

  ingest(queryPart);
  ingest(hashPart || '');
  return out;
}

export function getPathFromUrl(url: string): string {
  const normalized = url.trim();
  if (!normalized) return '';

  const withoutHash = normalized.split('#', 1)[0] || normalized;
  const withoutQuery = withoutHash.split('?', 1)[0] || withoutHash;
  const schemeMatch = /^[a-z][a-z0-9+\-.]*:\/\/(.*)$/i.exec(withoutQuery);
  const remainder = schemeMatch ? schemeMatch[1] : withoutQuery;
  return remainder.replace(/^\/+/, '').trim().toLowerCase();
}
