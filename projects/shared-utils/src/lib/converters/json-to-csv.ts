function flattenObject(obj: any, parentKey = '', result: any = {}) {
  for (let key in obj) {
    const newKey = parentKey ? `${parentKey}_${key}` : key;

    if (Array.isArray(obj[key])) {
      obj[key].forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          flattenObject(item, `${newKey}_${index}`, result);
        } else {
          result[`${newKey}_${index}`] = item;
        }
      });
    } 
    else if (obj[key] && typeof obj[key] === 'object') {
      flattenObject(obj[key], newKey, result);
    } 
    else {
      result[newKey] = obj[key];
    }
  }
  return result;
}

export function jsonToCsv(jsonData: any[]): string {
  if (!Array.isArray(jsonData)) jsonData = [jsonData];

  const flattened = jsonData.map(item => flattenObject(item));

  const headers = Array.from(
    flattened.reduce((set, obj) => {
      Object.keys(obj).forEach(k => set.add(k));
      return set;
    }, new Set<string>())
  );

  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of flattened) {
    const values = headers.map((h:any) => {
      let val = row[h] ?? '';
      if (typeof val === 'string') {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}
