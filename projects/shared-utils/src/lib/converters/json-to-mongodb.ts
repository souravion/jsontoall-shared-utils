export function jsonToMongoQuery(json: any, collectionName = 'collection'): string {
  if (Array.isArray(json)) {
    const docs = json.map((item) => formatMongoObject(item)).join(',\n');
    return `db.${collectionName}.insertMany([\n${docs}\n]);`;
  }

  if (typeof json === 'object' && json !== null) {
    return `db.${collectionName}.insertOne(${formatMongoObject(json)});`;
  }

  throw new Error('Invalid JSON input');
}

function formatMongoObject(obj: any, indent = 2): string {
  const spacing = ' '.repeat(indent);

  const entries = Object.entries(obj).map(([key, value]) => {
    return `${spacing}${key}: ${formatMongoValue(value, indent + 2)}`;
  });

  return `{\n${entries.join(',\n')}\n${' '.repeat(indent - 2)}}`;
}

function formatMongoValue(value: any, indent: number): string {
  if (value === null) return 'null';

  if (typeof value === 'string') {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((v) => formatMongoValue(v, indent)).join(', ');
    return `[${items}]`;
  }

  if (typeof value === 'object') {
    return formatMongoObject(value, indent);
  }

  return String(value);
}