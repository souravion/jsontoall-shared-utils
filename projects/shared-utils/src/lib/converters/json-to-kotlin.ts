// =============================
// TYPES
// =============================

type KotlinType =
  | 'String'
  | 'Int'
  | 'Double'
  | 'Boolean'
  | 'Any'
  | string;

// =============================
// MAIN EXPORT FUNCTION
// =============================

export function convertJsonToKotlin(
  jsonString: string,
  rootClassName: string = 'RootModel',
  nullable: boolean = false
): string {
  const parsed = JSON.parse(jsonString);

  const classMap = new Map<string, string>();
  generateClass(rootClassName, parsed, classMap, nullable);

  return Array.from(classMap.values()).join('\n\n');
}

// =============================
// CLASS GENERATOR
// =============================

function generateClass(
  className: string,
  obj: any,
  classMap: Map<string, string>,
  nullable: boolean
) {
  if (classMap.has(className)) return;

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      generateClass(className, obj[0], classMap, nullable);
    }
    return;
  }

  if (typeof obj !== 'object' || obj === null) return;

  const properties: string[] = [];

  for (const key in obj) {
    const value = obj[key];
    const propertyType = resolveType(key, value, classMap, nullable);
    const optionalMark = nullable ? '?' : '';
    properties.push(`    val ${key}: ${propertyType}${optionalMark}`);
  }

  const classDefinition = `data class ${className}(\n${properties.join(
    ',\n'
  )}\n)`;

  classMap.set(className, classDefinition);
}

// =============================
// TYPE RESOLVER
// =============================

function resolveType(
  key: string,
  value: any,
  classMap: Map<string, string>,
  nullable: boolean
): KotlinType {
  if (value === null) return 'Any';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<Any>';

    const first = value[0];

    if (typeof first === 'object' && first !== null) {
      const className = capitalize(key);
      generateClass(className, first, classMap, nullable);
      return `List<${className}>`;
    }

    return `List<${resolvePrimitive(first)}>`;
  }

  if (typeof value === 'object') {
    const className = capitalize(key);
    generateClass(className, value, classMap, nullable);
    return className;
  }

  return resolvePrimitive(value);
}

// =============================
// PRIMITIVE MAPPING
// =============================

function resolvePrimitive(value: any): KotlinType {
  switch (typeof value) {
    case 'string':
      return 'String';
    case 'number':
      return Number.isInteger(value) ? 'Int' : 'Double';
    case 'boolean':
      return 'Boolean';
    default:
      return 'Any';
  }
}

// =============================
// HELPERS
// =============================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}