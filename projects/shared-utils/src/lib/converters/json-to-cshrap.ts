export interface ComparisonStats {
  jsonTokens: number;
  csharpTokens: number;
  jsonSize: number;
  csharpSize: number;
  savings: number;
}

// =============================
// MAIN EXPORT FUNCTION
// =============================
export function convertJsonToCSharp(
  jsonString: string,
  rootClassName: string = 'RootObject'
): string {
  const parsed = JSON.parse(jsonString);
  const generatedClasses = new Map<string, string>();

  // ✅ Handle root array
  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && isPlainObject(parsed[0])) {
      generateClass(parsed[0], rootClassName, generatedClasses);
    }
  } else {
    generateClass(parsed, rootClassName, generatedClasses);
  }

  return Array.from(generatedClasses.values()).join('\n\n');
}

// =============================
// RECURSIVE CLASS GENERATOR
// =============================
function generateClass(
  obj: any,
  className: string,
  classMap: Map<string, string>
) {
  if (!isPlainObject(obj) || classMap.has(className)) return;

  let classBody = `public class ${className}\n{\n`;

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const propertyName = toPascalCase(key);

    const type = resolveType(value, propertyName, classMap);

    classBody += `    public ${type} ${propertyName} { get; set; }\n`;
  });

  classBody += `}`;

  classMap.set(className, classBody);
}

// =============================
// TYPE RESOLVER
// =============================
function resolveType(
  value: any,
  propertyName: string,
  classMap: Map<string, string>
): string {
  // ✅ Null → nullable object
  if (value === null) return 'object?';

  // ✅ Array handling
  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<object>';

    const firstItem = value[0];

    if (isPlainObject(firstItem)) {
      const childClassName = propertyName;
      generateClass(firstItem, childClassName, classMap);
      return `List<${childClassName}>`;
    }

    return `List<${resolvePrimitive(firstItem)}>`;
  }

  // ✅ Nested object
  if (isPlainObject(value)) {
    const childClassName = propertyName;
    generateClass(value, childClassName, classMap);
    return childClassName;
  }

  return resolvePrimitive(value);
}

// =============================
// PRIMITIVE TYPE MAPPING
// =============================
function resolvePrimitive(value: any): string {
  switch (typeof value) {
    case 'string':
      return isIsoDate(value) ? 'DateTime' : 'string';

    case 'number':
      return Number.isInteger(value) ? 'int' : 'decimal'; // ✅ decimal instead of double

    case 'boolean':
      return 'bool';

    default:
      return 'object';
  }
}

// =============================
// HELPERS
// =============================
function isPlainObject(obj: any): boolean {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// ✅ ISO Date Detection
function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

// =============================
// COMPARISON
// =============================
export function calculateComparison(
  jsonString: string,
  csharpString: string
): ComparisonStats {
  const jsonTokens = countTokens(jsonString);
  const csharpTokens = countTokens(csharpString);
  const jsonSize = new Blob([jsonString]).size;
  const csharpSize = new Blob([csharpString]).size;

  const savings =
    jsonSize > 0
      ? ((jsonSize - csharpSize) / jsonSize) * 100
      : 0;

  return {
    jsonTokens,
    csharpTokens,
    jsonSize,
    csharpSize,
    savings,
  };
}

function countTokens(text: string): number {
  const tokens = text.match(/\w+|[{}[\];,.<>]/g);
  return tokens ? tokens.length : 0;
}

// =============================
// VALIDATION
// =============================
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}