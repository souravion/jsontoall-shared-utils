export function jsonToTsInterfaces(
  jsonInput: string | object,
  rootName: string = 'RootObjects'
): string {
  const parsed =
    typeof jsonInput === 'string' ? safelyParseJSON(jsonInput) : jsonInput;

  if (!parsed || typeof parsed !== 'object') {
    return '// ❌ Invalid JSON input';
  }

  const interfaces: Map<string, string[]> = new Map();

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      const itemInterfaceName = singularize(rootName);
      return `export interface ${itemInterfaceName} {}\n\nexport type ${rootName} = ${itemInterfaceName}[];`;
    }

    // Use a distinct name for the interface representing array elements
    const arrayItemInterfaceName = singularize(rootName); 
    const itemType = inferType(parsed[0], arrayItemInterfaceName, interfaces);

    // Explicitly handle and remove the item interface from the map to place it at the top
    const itemInterfaceLines = interfaces.get(arrayItemInterfaceName) || [];
    if (interfaces.has(arrayItemInterfaceName)) {
        interfaces.delete(arrayItemInterfaceName);
    }

    const generatedInterfaces = Array.from(interfaces.entries())
        .sort(([nameA], [nameB]) => nameA.localeCompare(nameB)) // Sort for consistent dependency order
        .map(([name, lines]) => `export interface ${name} {\n${lines.join('\n')}\n}`)
        .join('\n\n');

    const rootTypeDefinition = `export type ${rootName} = ${itemType}[];`;

    const outputParts: string[] = [];
    if (itemInterfaceLines.length > 0) {
        outputParts.push(`export interface ${arrayItemInterfaceName} {\n${itemInterfaceLines.join('\n')}\n}`);
    }
    if (generatedInterfaces) {
        outputParts.push(generatedInterfaces);
    }
    outputParts.push(rootTypeDefinition);

    return outputParts.join('\n\n');

  } else { // Handle single object as root
    buildInterface(parsed, rootName, interfaces);

    const rootObjectLines = interfaces.get(rootName) || [];
    interfaces.delete(rootName);

    const dependencyInterfaces = Array.from(interfaces.entries())
      .sort(([nameA], [nameB]) => nameA.localeCompare(nameB)) 
      .map(([name, lines]) => `export interface ${name} {\n${lines.join('\n')}\n}`)
      .join('\n\n');

    const rootInterfaceDefinition = `export interface ${rootName} {\n${rootObjectLines.join('\n')}\n}`;

    return dependencyInterfaces ? `${rootInterfaceDefinition}\n\n${dependencyInterfaces}` : rootInterfaceDefinition;
  }
}

function safelyParseJSON(jsonString: string): any | null {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

function buildInterface(
  obj: any,
  name: string,
  interfaces: Map<string, string[]>
) {
  if (interfaces.has(name)) {
    return;
  }

  const lines: string[] = [];

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const type = inferType(value, capitalize(key), interfaces);
    lines.push(`  ${key}: ${type};`);
  }

  interfaces.set(name, lines);
}

function inferType(
  value: any,
  childName: string,
  interfaces: Map<string, string[]>
): string {
  if (value === null) return 'any';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'any[]';
    // When inferring the type of an array's elements, pass the childName directly
    // This is the name we want for the interface describing the array's items
    const firstType = inferType(value[0], childName, interfaces); 
    return `${firstType}[]`;
  }
  if (typeof value === 'object') {
    buildInterface(value, childName, interfaces);
    return childName;
  }
  return typeof value;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function singularize(str: string): string {
  // A more robust singularize might be needed for irregular plurals
  return str.endsWith('s') && str.length > 1 && !str.endsWith('ss') ? str.slice(0, -1) : str;
}
