/**
 * Minimal-dependency HTML sanitiser for admin-authored legal documents.
 *
 * The threat model here is "an admin pastes HTML into the legal-document
 * editor". We trust the admin much more than an untrusted user, but we still
 * want defence-in-depth so a malicious paste (or a future flow that lets less
 * privileged staff edit copy) can't ship XSS to every signed-in user.
 *
 * Approach:
 *   1. Run the input through the browser's own DOMParser so we get a real DOM
 *      tree instead of regex-mangling strings (regex sanitisers are notorious
 *      for missing edge cases).
 *   2. Walk every element and:
 *        - drop tags that are not on `ALLOWED_TAGS` (`<script>`, `<iframe>`,
 *          `<object>`, `<embed>`, `<link>`, `<base>`, `<style>` are removed),
 *        - drop attributes not on `ALLOWED_ATTRS` for that tag (so `onclick`
 *          handlers can never survive),
 *        - reject `href` / `src` whose URL scheme is not in `SAFE_SCHEMES`
 *          (kills `javascript:`, `data:`, `vbscript:`, etc.).
 *   3. Force every external link to `target="_blank"` + `rel="noopener
 *      noreferrer"`.
 *
 * The output is the inner HTML of the cleaned `<body>`, ready to drop into
 * `dangerouslySetInnerHTML`.
 */

const ALLOWED_TAGS = new Set<string>([
  'a',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
])

const GLOBAL_ATTRS = new Set<string>(['class', 'id', 'lang', 'dir', 'title'])
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
}

const SAFE_SCHEMES = /^(?:https?:|mailto:|tel:|#|\/)/i

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  // Reject anything that doesn't look like an http(s)/mailto/tel link or a
  // same-page anchor / relative path. Critically blocks `javascript:` URIs.
  return SAFE_SCHEMES.test(trimmed)
}

function sanitizeElement(node: Element): void {
  const tag = node.tagName.toLowerCase()

  if (!ALLOWED_TAGS.has(tag)) {
    // Replace with text content so headings inside disallowed wrappers still
    // appear (rather than nuking entire blocks of copy).
    const replacement = node.ownerDocument.createTextNode(node.textContent ?? '')
    node.parentNode?.replaceChild(replacement, node)
    return
  }

  const attrAllow = TAG_ATTRS[tag] ?? new Set<string>()
  const toRemove: string[] = []
  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase()
    if (!GLOBAL_ATTRS.has(name) && !attrAllow.has(name)) {
      toRemove.push(attr.name)
      continue
    }
    if (name === 'href' || name === 'src') {
      if (!isSafeUrl(attr.value)) {
        toRemove.push(attr.name)
      }
    }
  }
  for (const name of toRemove) node.removeAttribute(name)

  if (tag === 'a') {
    const href = node.getAttribute('href')
    if (href && /^(?:https?:|mailto:|tel:)/i.test(href)) {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  }

  for (const child of Array.from(node.children)) {
    sanitizeElement(child)
  }
}

/** Sanitise a string of HTML for safe use with `dangerouslySetInnerHTML`. */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  // Bail out gracefully if running on a non-DOM platform (shouldn't happen in
  // a Vite SPA, but keeps Vitest / SSR happy).
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html.replace(/<script[\s\S]*?<\/script>/gi, '')
  }
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const body = doc.body
  // Strip <style>, <script>, <link>, <meta>, <base> entirely from the doc
  // before walking — they'd otherwise be replaced with text and clutter the
  // page with raw CSS/JS.
  for (const tag of ['script', 'style', 'link', 'meta', 'base', 'iframe', 'object', 'embed']) {
    for (const el of Array.from(body.getElementsByTagName(tag))) {
      el.parentNode?.removeChild(el)
    }
  }
  for (const child of Array.from(body.children)) {
    sanitizeElement(child)
  }
  return body.innerHTML
}

export default sanitizeHtml
