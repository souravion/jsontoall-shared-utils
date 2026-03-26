export function jsonToToml(obj: any, parentKey = ''): string {
  let tomlString = '';

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          tomlString += `[${fullKey}.${index}]\n`;
          tomlString += jsonToToml(item, `${fullKey}.${index}`);
        } else {
          tomlString += `${fullKey} = ${formatTomlValue(item)}\n`;
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      tomlString += `[${fullKey}]\n`;
      tomlString += jsonToToml(value, fullKey);
    } else {
      tomlString += `${fullKey} = ${formatTomlValue(value)}\n`;
    }
  }

  return tomlString;
}

function formatTomlValue(value: any): string {
  if (typeof value === 'string') {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}
