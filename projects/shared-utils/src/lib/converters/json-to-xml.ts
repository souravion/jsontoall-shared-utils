// json-to-xml.util.ts
export function jsonToXmlSafe(input: string | object, rootName = 'root'): string {
  // --- Helper: Decode HTML entities ---
  const decodeHtmlEntities = (s: string): string =>
    s
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

  // --- Helper: Convert JS-like object to valid JSON ---
  const toValidJsonString = (s: string): string => {
    return s
      .trim()
      .replace(/^\{?/, '{') // ensure starts with {
      .replace(/;?\s*$/, '') // remove trailing semicolon
      .replace(/([{,]\s*)([A-Za-z0-9_\-]+)\s*:/g, '$1"$2":') // quote keys
      .replace(/'([^']*)'/g, (_m, g1) => `"${g1.replace(/"/g, '\\"')}"`); // single → double quotes
  };

  // --- Helper: Escape XML special chars ---
  const escapeXml = (v: string): string =>
    v.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  // --- Recursive JSON → XML ---
  const convert = (obj: any, tagName?: string): string => {
    if (obj === null || obj === undefined) {
      return tagName ? `<${tagName}/>` : '';
    }
    if (typeof obj !== 'object') {
      return tagName ? `<${tagName}>${escapeXml(String(obj))}</${tagName}>` : escapeXml(String(obj));
    }
    if (Array.isArray(obj)) {
      return obj.map(item => convert(item, tagName)).join('');
    }
    const inner = Object.entries(obj).map(([k, v]) => convert(v, k)).join('');
    return tagName ? `<${tagName}>${inner}</${tagName}>` : inner;
  };

  // --- Pretty-print XML ---
  const formatXML = (xml: string): string => {
    const PADDING = '  ';
    let pad = 0;
    return xml
      .replace(/(>)(<)(\/*)/g, '$1\r\n$2$3')
      .split('\r\n')
      .map(node => {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
          indent = 0;
        } else if (node.match(/^<\/\w/)) {
          if (pad > 0) pad -= 1;
        } else if (node.match(/^<\w/)) {
          indent = 1;
        }
        const line = PADDING.repeat(pad) + node;
        pad += indent;
        return line;
      })
      .join('\n');
  };

  // --- Main: parse input into object ---
  let jsonObject: any;
  if (typeof input === 'object') {
    jsonObject = input;
  } else {
    let str = decodeHtmlEntities(String(input).trim());

    // Remove <root> wrappers if present
    const match = str.match(/^<([a-zA-Z0-9_-]+)>([\s\S]*)<\/\1>$/);
    if (match) str = match[2].trim();

    try {
      jsonObject = JSON.parse(str);
    } catch {
      try {
        jsonObject = JSON.parse(toValidJsonString(str));
      } catch {
        throw new Error('Invalid input: Cannot parse to JSON.');
      }
    }
  }

  // --- Build and format XML ---
  const rawXml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>${convert(jsonObject)}</${rootName}>`;
  return formatXML(rawXml);
}
