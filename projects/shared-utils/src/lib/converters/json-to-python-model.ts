// =============================
// TYPES
// =============================
export interface ComparisonStats {
  jsonTokens: number;
  pythonTokens: number;
  jsonSize: number;
  pythonSize: number;
  savings: number;
}

// =============================
// MAIN EXPORT FUNCTION
// =============================
export function convertJsonToPython(
  jsonString: string,
  rootClassName: string = 'RootModel'
): string {

  const parsed = JSON.parse(jsonString);

  const classMap = new Map<string, string>();
  const typingImports = new Set<string>();

  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && isPlainObject(parsed[0])) {
      generateClass(parsed[0], rootClassName, classMap, typingImports);
    }
  } else {
    generateClass(parsed, rootClassName, classMap, typingImports);
  }

  let header = '';

  if (typingImports.size > 0) {
    header += `from typing import ${Array.from(typingImports).sort().join(', ')}\n\n\n`;
  }

  return header + Array.from(classMap.values()).join('\n\n\n');
}

// =============================
// CLASS GENERATOR
// =============================
function generateClass(
  obj: any,
  className: string,
  classMap: Map<string, string>,
  typingImports: Set<string>
) {
  if (!isPlainObject(obj) || classMap.has(className)) return;

  const properties: string[] = [];
  const constructorParams: string[] = [];
  const constructorBody: string[] = [];

  Object.keys(obj).forEach((key) => {

    const value = obj[key];

    const safeName = toSafePythonName(key);
    const type = resolveType(value, key, classMap, typingImports);

    properties.push(`    ${safeName}: ${type}`);
    constructorParams.push(`${safeName}: ${type}`);
    constructorBody.push(`        self.${safeName} = ${safeName}`);
  });

  let classCode = `class ${className}:\n`;

  if (properties.length === 0) {
    classCode += `    pass`;
  } else {
    classCode += properties.join('\n') + '\n\n';
    classCode += `    def __init__(self, ${constructorParams.join(', ')}) -> None:\n`;
    classCode += constructorBody.join('\n');
  }

  classMap.set(className, classCode);
}

// =============================
// TYPE RESOLUTION
// =============================
function resolveType(
  value: any,
  propertyName: string,
  classMap: Map<string, string>,
  typingImports: Set<string>
): string {

  // NULL
  if (value === null) {
    typingImports.add('Optional');
    typingImports.add('Any');
    return 'Optional[Any]';
  }

  // ARRAY
  if (Array.isArray(value)) {

    typingImports.add('List');

    if (value.length === 0) {
      typingImports.add('Any');
      return 'List[Any]';
    }

    const first = value[0];

    if (isPlainObject(first)) {
      const childClass = toPascalCase(propertyName);
      generateClass(first, childClass, classMap, typingImports);
      return `List[${childClass}]`;
    }

    return `List[${resolvePrimitive(first, typingImports)}]`;
  }

  // OBJECT
  if (isPlainObject(value)) {
    const childClassName = toPascalCase(propertyName);
    generateClass(value, childClassName, classMap, typingImports);
    return childClassName;
  }

  return resolvePrimitive(value, typingImports);
}

// =============================
// PRIMITIVES
// =============================
function resolvePrimitive(
  value: any,
  typingImports: Set<string>
): string {
  switch (typeof value) {
    case 'string':
      return 'str';
    case 'number':
      return Number.isInteger(value) ? 'int' : 'float';
    case 'boolean':
      return 'bool';
    default:
      typingImports.add('Any');
      return 'Any';
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
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function toSafePythonName(name: string): string {
  const reserved = new Set([
    'class', 'def', 'return', 'from', 'import', 'as',
    'if', 'else', 'elif', 'for', 'while', 'try',
    'except', 'with', 'lambda', 'pass', 'break',
    'continue', 'global', 'nonlocal', 'assert'
  ]);

  if (reserved.has(name)) return name + '_';
  return name;
}

// =============================
// COMPARISON
// =============================
export function calculateComparison(
  jsonString: string,
  pythonString: string
): ComparisonStats {

  const jsonTokens = countTokens(jsonString);
  const pythonTokens = countTokens(pythonString);
  const jsonSize = new Blob([jsonString]).size;
  const pythonSize = new Blob([pythonString]).size;

  const savings =
    jsonSize > 0
      ? ((jsonSize - pythonSize) / jsonSize) * 100
      : 0;

  return {
    jsonTokens,
    pythonTokens,
    jsonSize,
    pythonSize,
    savings,
  };
}

function countTokens(text: string): number {
  const tokens = text.match(/\w+|[{}[\];,.<>():]/g);
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