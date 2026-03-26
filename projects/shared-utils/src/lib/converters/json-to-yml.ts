export function jsonToYaml(input: any, indent = 0): string {
  // If input is a string, parse JSON safely
  let data = input;

  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch (e) {
      // return plain string as YAML
      return formatValue(input);
    }
  }

  const spaces = ' '.repeat(indent);
  let yaml = '';

  if (Array.isArray(data)) {
    for (const item of data) {
      if (isObject(item) || Array.isArray(item)) {
        yaml += `${spaces}-\n`;
        yaml += jsonToYaml(item, indent + 2);
      } else {
        yaml += `${spaces}- ${formatValue(item)}\n`;
      }
    }
  } else if (isObject(data)) {
    for (const key of Object.keys(data)) {
      const value = data[key];
      if (isObject(value) || Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        yaml += jsonToYaml(value, indent + 2);
      } else {
        yaml += `${spaces}${key}: ${formatValue(value)}\n`;
      }
    }
  } else {
    // primitive values
    return `${spaces}${formatValue(data)}\n`;
  }

  return yaml;
}

function isObject(val: any): boolean {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function formatValue(value: any): string {
  if (typeof value === 'string') {
    if (/[^a-zA-Z0-9_\- ]/.test(value)) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  if (value === null) return "null";
  if (typeof value === 'boolean') return value.toString();
  return String(value);
}
