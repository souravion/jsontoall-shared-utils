export interface ComparisonStats {
  jsonTokens: number;
  toonTokens: number;
  jsonSize: number;
  toonSize: number;
  savings: number;
}

// Main export function - Convert JSON string to TOON format
export function convertJsonToToon(jsonString: string): string {
  const parsed = JSON.parse(jsonString);
  return objectToToon(parsed, 0);
}

// Convert object to TOON format recursively
function objectToToon(obj: any, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel);

  if (Array.isArray(obj)) {
    return arrayToToon(obj, indentLevel);
  } 
  else if (obj !== null && typeof obj === 'object') {
    return objectStructureToToon(obj, indentLevel);
  } 
  else {
    return primitiveToToon(obj);
  }
}

// Convert array to TOON format (tabular if uniform)
function arrayToToon(arr: any[], indentLevel: number): string {
  if (arr.length === 0) return '[]';

  const indent = '  '.repeat(indentLevel);
  
  // Check if array contains uniform objects (same keys)
  if (isUniformObjectArray(arr)) {
    const keys = Object.keys(arr[0]);
    let result = `[${arr.length}]{${keys.join(',')}}:\n`;
    
    arr.forEach(item => {
      result += indent + '  ';
      const values = keys.map(key => primitiveToToon(item[key]));
      result += values.join(',') + '\n';
    });
    
    return result.trimEnd();
  } 
  // Simple array (primitives or mixed)
  else if (isPrimitiveArray(arr)) {
    return `[${arr.length}]: ${arr.map(v => primitiveToToon(v)).join(',')}`;
  }
  // Non-uniform array
  else {
    let result = `[${arr.length}]:\n`;
    arr.forEach(item => {
      const itemStr = objectToToon(item, indentLevel + 1);
      result += indent + '  ' + itemStr + '\n';
    });
    return result.trimEnd();
  }
}

// Convert object to TOON format (indentation-based)
function objectStructureToToon(obj: any, indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);
  const keys = Object.keys(obj);
  
  if (keys.length === 0) return '{}';
  
  let result = '';
  keys.forEach((key, index) => {
    const value = obj[key];
    
    if (value === null || typeof value !== 'object') {
      // Simple key-value
      result += indent + key + ': ' + primitiveToToon(value);
    } else if (Array.isArray(value)) {
      // Array
      result += indent + key + arrayToToon(value, indentLevel);
    } else {
      // Nested object
      result += indent + key + ':\n' + objectStructureToToon(value, indentLevel + 1);
    }
    
    if (index < keys.length - 1) result += '\n';
  });
  
  return result;
}

// Convert primitive value to TOON format
function primitiveToToon(value: any): string {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    // Only quote if necessary (contains comma, colon, or special chars)
    if (needsQuotes(value)) {
      return '"' + value.replace(/"/g, '\\"') + '"';
    }
    return value;
  }
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  return String(value);
}

// Check if string needs quotes
function needsQuotes(str: string): boolean {
  return /[,:"\n\r\t]|^\s|\s$/.test(str) || str === '' || str === 'null' || str === 'true' || str === 'false';
}

// Check if array contains uniform objects
function isUniformObjectArray(arr: any[]): boolean {
  if (arr.length === 0) return false;
  if (!isPlainObject(arr[0])) return false;
  
  const firstKeys = Object.keys(arr[0]).sort().join(',');
  return arr.every(item => 
    isPlainObject(item) && 
    Object.keys(item).sort().join(',') === firstKeys
  );
}

// Check if array contains only primitives
function isPrimitiveArray(arr: any[]): boolean {
  return arr.every(item => 
    item === null || 
    typeof item === 'string' || 
    typeof item === 'number' || 
    typeof item === 'boolean'
  );
}

// Check if value is plain object
function isPlainObject(obj: any): boolean {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

// Calculate comparison statistics
export function calculateComparison(jsonString: string, toonString: string): ComparisonStats {
  const jsonTokens = countTokens(jsonString);
  const toonTokens = countTokens(toonString);
  const jsonSize = new Blob([jsonString]).size;
  const toonSize = new Blob([toonString]).size;
  
  const savings = jsonSize > 0 
    ? ((jsonSize - toonSize) / jsonSize) * 100 
    : 0;

  return {
    jsonTokens,
    toonTokens,
    jsonSize,
    toonSize,
    savings
  };
}

// Count tokens (approximate)
function countTokens(text: string): number {
  const tokens = text.match(/\w+|[{}[\]:,]/g);
  return tokens ? tokens.length : 0;
}

// Validate JSON
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
