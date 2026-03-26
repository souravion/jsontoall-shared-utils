// ============================================
// JSON TO JAVA CLASS CONVERTER UTILITY
// ============================================
// src/app/utils/json-to-java.util.ts

/**
 * Convert JSON string to Java class code
 * @param jsonString - JSON string input
 * @returns Java class code
 */
export function jsonToJavaClass(jsonString: string): string {
  try {
    const jsonObj = JSON.parse(jsonString);
    
    // Handle if root is an array
    if (Array.isArray(jsonObj)) {
      if (jsonObj.length === 0) {
        throw new Error('Empty array - cannot generate class');
      }
      const firstElement = jsonObj[0];
      if (typeof firstElement !== 'object' || firstElement === null) {
        throw new Error('Array must contain objects');
      }
      const className = generateClassName(firstElement);
      return generateJavaClass(className, firstElement, false);
    }
    
    // Handle object
    const className = generateClassName(jsonObj);
    return generateJavaClass(className, jsonObj, false);
  } catch (error) {
    throw new Error('Invalid JSON format: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Generate class name from JSON structure
 */
function generateClassName(obj: any): string {
  if (obj.name && typeof obj.name === 'string') {
    return toPascalCase(obj.name);
  }
  if (obj.type && typeof obj.type === 'string') {
    return toPascalCase(obj.type);
  }
  return 'Application';
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Singularize a word (remove plural 's')
 */
function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/**
 * Get Java type for a given value
 */
function getJavaType(value: any): string {
  if (value === null) return 'Object';
  
  const type = typeof value;
  
  switch (type) {
    case 'string':
      return 'String';
    case 'number':
      return Number.isInteger(value) ? 'int' : 'float';
    case 'boolean':
      return 'boolean';
    default:
      if (Array.isArray(value)) {
        return getArrayType(value);
      }
      return 'Object';
  }
}

/**
 * Get Java wrapper type (for getters/setters)
 */
function getJavaWrapperType(value: any): string {
  if (value === null) return 'Object';
  
  const type = typeof value;
  
  switch (type) {
    case 'string':
      return 'String';
    case 'number':
      return Number.isInteger(value) ? 'Integer' : 'Float';
    case 'boolean':
      return 'Boolean';
    default:
      if (Array.isArray(value)) {
        return getArrayType(value);
      }
      return 'Object';
  }
}

/**
 * Get Java type for arrays
 */
function getArrayType(arr: any[]): string {
  if (arr.length === 0) return 'List<Object>';
  
  const firstElement = arr[0];
  
  if (typeof firstElement === 'object' && firstElement !== null) {
    return 'List<Object>';
  }
  
  const elementType = getJavaWrapperType(firstElement);
  return `List<${elementType}>`;
}

/**
 * Generate complete Java class with getters and setters
 */
function generateJavaClass(className: string, obj: any, isNested: boolean): string {
  let code = '';
  const nestedClasses: string[] = [];
  const fields: Array<{key: string, type: string, wrapperType: string}> = [];
  
  // Class declaration
  code += `public class ${className} {\n`;

  // Generate fields
  for (const [key, value] of Object.entries(obj)) {
    const fieldName = sanitizeFieldName(key);
    
    // Handle nested objects
    if (isNestedObject(value)) {
      const nestedClassName = toPascalCase(key);
      fields.push({key: fieldName, type: nestedClassName, wrapperType: nestedClassName});
      code += `  private ${nestedClassName} ${fieldName};\n`;
      nestedClasses.push(generateJavaClass(nestedClassName, value, true));
    }
    // Handle arrays of objects
    else if (isArrayOfObjects(value)) {
      const nestedClassName = toPascalCase(singularize(key));
      const listType = `List<${nestedClassName}>`;
      fields.push({key: fieldName, type: listType, wrapperType: listType});
      code += `  private ${listType} ${fieldName};\n`;
      
      const firstElement = (value as any[])[0];
      if (firstElement) {
        nestedClasses.push(generateJavaClass(nestedClassName, firstElement, true));
      }
    }
    // Handle primitive types and simple arrays
    else {
      const javaType = getJavaType(value);
      const wrapperType = getJavaWrapperType(value);
      fields.push({key: fieldName, type: javaType, wrapperType: wrapperType});
      code += `  private ${javaType} ${fieldName};\n`;
    }
  }

  // Getter Methods
  code += ' // Getter Methods \n';
  for (const field of fields) {
    const methodName = `get${toPascalCase(field.key)}`;
    code += `  public ${field.wrapperType} ${methodName}() {\n`;
    code += `    return ${field.key};\n`;
    code += `  }\n`;
  }

  // Setter Methods
  code += ' // Setter Methods \n';
  for (const field of fields) {
    const methodName = `set${toPascalCase(field.key)}`;
    code += `  public void ${methodName}( ${field.wrapperType} ${field.key} ) {\n`;
    code += `    this.${field.key} = ${field.key};\n`;
    code += `  }\n`;
  }

  // Close class
  code += '}\n';

  // Append nested classes
  if (nestedClasses.length > 0 && !isNested) {
    code += '\n' + nestedClasses.join('\n\n');
  }

  return code;
}

/**
 * Sanitize field name to be a valid Java identifier
 */
function sanitizeFieldName(name: string): string {
  // If it starts with a number, prefix with underscore
  if (/^\d/.test(name)) {
    return `field${name}`;
  }
  
  // Use camelCase
  let sanitized = toCamelCase(name);
  
  // If it's a Java keyword, suffix with underscore
  const javaKeywords = [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch',
    'char', 'class', 'const', 'continue', 'default', 'do', 'double',
    'else', 'enum', 'extends', 'final', 'finally', 'float', 'for',
    'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface',
    'long', 'native', 'new', 'package', 'private', 'protected', 'public',
    'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized',
    'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while'
  ];
  
  if (javaKeywords.includes(sanitized.toLowerCase())) {
    sanitized += '_';
  }
  
  return sanitized;
}

/**
 * Check if value is a nested object (not array)
 */
function isNestedObject(value: any): boolean {
  return typeof value === 'object' && 
         value !== null && 
         !Array.isArray(value);
}

/**
 * Check if value is an array of objects with safe type checking
 */
function isArrayOfObjects(value: any): boolean {
  return Array.isArray(value) && 
         value.length > 0 && 
         value[0] !== undefined &&
         value[0] !== null &&
         typeof value[0] === 'object';
}

// ============================================
// USAGE EXAMPLE
// ============================================

/*
import { jsonToJavaClass } from '@/utils/json-to-java.util';

const jsonInput = `{
  "name": "Sourav Halder",
  "email": "sourav.ion@gmail.com",
  "age": 28,
  "active": true
}`;

const javaClass = jsonToJavaClass(jsonInput);
console.log(javaClass);

Output:
public class Application {
  private String name;
  private String email;
  private int age;
  private boolean active;
 // Getter Methods 
  public String getName() {
    return name;
  }
  public String getEmail() {
    return email;
  }
  public Integer getAge() {
    return age;
  }
  public Boolean getActive() {
    return active;
  }
 // Setter Methods 
  public void setName( String name ) {
    this.name = name;
  }
  public void setEmail( String email ) {
    this.email = email;
  }
  public void setAge( Integer age ) {
    this.age = age;
  }
  public void setActive( Boolean active ) {
    this.active = active;
  }
}
*/