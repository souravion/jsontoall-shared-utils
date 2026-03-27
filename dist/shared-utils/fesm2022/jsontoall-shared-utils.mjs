function flattenObject$2(obj, parentKey = '', result = {}) {
    for (let key in obj) {
        const newKey = parentKey ? `${parentKey}_${key}` : key;
        if (Array.isArray(obj[key])) {
            obj[key].forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    flattenObject$2(item, `${newKey}_${index}`, result);
                }
                else {
                    result[`${newKey}_${index}`] = item;
                }
            });
        }
        else if (obj[key] && typeof obj[key] === 'object') {
            flattenObject$2(obj[key], newKey, result);
        }
        else {
            result[newKey] = obj[key];
        }
    }
    return result;
}
function jsonToCsv(jsonData) {
    if (!Array.isArray(jsonData))
        jsonData = [jsonData];
    const flattened = jsonData.map(item => flattenObject$2(item));
    const headers = Array.from(flattened.reduce((set, obj) => {
        Object.keys(obj).forEach(k => set.add(k));
        return set;
    }, new Set()));
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of flattened) {
        const values = headers.map((h) => {
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

// =============================
// MAIN EXPORT FUNCTION
// =============================
function convertJsonToCSharp(jsonString, rootClassName = 'RootObject') {
    const parsed = JSON.parse(jsonString);
    const generatedClasses = new Map();
    // ✅ Handle root array
    if (Array.isArray(parsed)) {
        if (parsed.length > 0 && isPlainObject$2(parsed[0])) {
            generateClass$3(parsed[0], rootClassName, generatedClasses);
        }
    }
    else {
        generateClass$3(parsed, rootClassName, generatedClasses);
    }
    return Array.from(generatedClasses.values()).join('\n\n');
}
// =============================
// RECURSIVE CLASS GENERATOR
// =============================
function generateClass$3(obj, className, classMap) {
    if (!isPlainObject$2(obj) || classMap.has(className))
        return;
    let classBody = `public class ${className}\n{\n`;
    Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const propertyName = toPascalCase$3(key);
        const type = resolveType$4(value, propertyName, classMap);
        classBody += `    public ${type} ${propertyName} { get; set; }\n`;
    });
    classBody += `}`;
    classMap.set(className, classBody);
}
// =============================
// TYPE RESOLVER
// =============================
function resolveType$4(value, propertyName, classMap) {
    // ✅ Null → nullable object
    if (value === null)
        return 'object?';
    // ✅ Array handling
    if (Array.isArray(value)) {
        if (value.length === 0)
            return 'List<object>';
        const firstItem = value[0];
        if (isPlainObject$2(firstItem)) {
            const childClassName = propertyName;
            generateClass$3(firstItem, childClassName, classMap);
            return `List<${childClassName}>`;
        }
        return `List<${resolvePrimitive$2(firstItem)}>`;
    }
    // ✅ Nested object
    if (isPlainObject$2(value)) {
        const childClassName = propertyName;
        generateClass$3(value, childClassName, classMap);
        return childClassName;
    }
    return resolvePrimitive$2(value);
}
// =============================
// PRIMITIVE TYPE MAPPING
// =============================
function resolvePrimitive$2(value) {
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
function isPlainObject$2(obj) {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}
function toPascalCase$3(str) {
    return str
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}
// ✅ ISO Date Detection
function isIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}
// =============================
// COMPARISON
// =============================
function calculateComparison$2(jsonString, csharpString) {
    const jsonTokens = countTokens$2(jsonString);
    const csharpTokens = countTokens$2(csharpString);
    const jsonSize = new Blob([jsonString]).size;
    const csharpSize = new Blob([csharpString]).size;
    const savings = jsonSize > 0
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
function countTokens$2(text) {
    const tokens = text.match(/\w+|[{}[\];,.<>]/g);
    return tokens ? tokens.length : 0;
}
// =============================
// VALIDATION
// =============================
function isValidJson$2(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch {
        return false;
    }
}

function jsonToDartModel(json, modelName = 'AutoGenerated') {
    const models = new Map();
    if (Array.isArray(json)) {
        if (json.length === 0)
            return `// Empty array — no model generated`;
        const merged = mergeObjects$3(json);
        generateModel$1(merged, modelName, models);
    }
    else if (typeof json === 'object' && json !== null) {
        generateModel$1(json, modelName, models);
    }
    else {
        throw new Error('Invalid JSON input: must be an object or array');
    }
    return buildOutput$3(models);
}
// ─── Output builder ────────────────────────────────────────────────────────────
function buildOutput$3(models) {
    return [...models.values()].join('\n\n');
}
// ─── Model generator ───────────────────────────────────────────────────────────
function generateModel$1(obj, modelName, models) {
    if (models.has(modelName))
        return;
    // Reserve immediately to break circular references
    models.set(modelName, '');
    const fields = [];
    const constructorParams = [];
    const fromJsonLines = [];
    const toJsonLines = [];
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        const dartName = toDartFieldName(key);
        const dartType = resolveType$3(value, capitalize$5(dartName), models);
        // ── Field declaration ──────────────────────────────────────────────────
        fields.push(`  ${dartType}? ${dartName};`);
        // ── Constructor param ──────────────────────────────────────────────────
        constructorParams.push(`this.${dartName}`);
        // ── fromJson ───────────────────────────────────────────────────────────
        fromJsonLines.push(...buildFromJsonLines(key, dartName, dartType, value));
        // ── toJson ─────────────────────────────────────────────────────────────
        toJsonLines.push(...buildToJsonLines(key, dartName, dartType, value));
    }
    const ctor = `  ${modelName}({${constructorParams.join(', ')}});`;
    const body = [
        `class ${modelName} {`,
        ...fields,
        ``,
        ctor,
        ``,
        `  ${modelName}.fromJson(Map<String, dynamic> json) {`,
        ...fromJsonLines,
        `  }`,
        ``,
        `  Map<String, dynamic> toJson() {`,
        `    final Map<String, dynamic> data = new Map<String, dynamic>();`,
        ...toJsonLines,
        `    return data;`,
        `  }`,
        `}`,
    ].join('\n');
    models.set(modelName, body);
}
// ─── fromJson line builder ─────────────────────────────────────────────────────
function buildFromJsonLines(jsonKey, dartName, dartType, value) {
    // List of model objects
    if (dartType.startsWith('List<')) {
        const innerType = dartType.slice(5, -1); // strip List< >
        const isPrimitive = ['String', 'int', 'double', 'bool', 'dynamic'].includes(innerType);
        if (!isPrimitive) {
            return [
                `    if (json['${jsonKey}'] != null) {`,
                `      ${dartName} = <${innerType}>[];`,
                `      json['${jsonKey}'].forEach((v) {`,
                `        ${dartName}!.add(new ${innerType}.fromJson(v));`,
                `      });`,
                `    }`,
            ];
        }
        else {
            return [
                `    if (json['${jsonKey}'] != null) {`,
                `      ${dartName} = List<${innerType}>.from(json['${jsonKey}']);`,
                `    }`,
            ];
        }
    }
    // Nested model object
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return [
            `    ${dartName} = json['${jsonKey}'] != null ? new ${dartType}.fromJson(json['${jsonKey}']) : null;`,
        ];
    }
    // Primitive / null / dynamic
    return [`    ${dartName} = json['${jsonKey}'];`];
}
// ─── toJson line builder ───────────────────────────────────────────────────────
function buildToJsonLines(jsonKey, dartName, dartType, value) {
    // List of model objects
    if (dartType.startsWith('List<')) {
        const innerType = dartType.slice(5, -1);
        const isPrimitive = ['String', 'int', 'double', 'bool', 'dynamic'].includes(innerType);
        if (!isPrimitive) {
            return [
                `    if (this.${dartName} != null) {`,
                `      data['${jsonKey}'] = this.${dartName}!.map((v) => v.toJson()).toList();`,
                `    }`,
            ];
        }
        else {
            return [`    data['${jsonKey}'] = this.${dartName};`];
        }
    }
    // Nested model object
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return [
            `    if (this.${dartName} != null) {`,
            `      data['${jsonKey}'] = this.${dartName}!.toJson();`,
            `    }`,
        ];
    }
    // Primitive
    return [`    data['${jsonKey}'] = this.${dartName};`];
}
// ─── Type resolver ─────────────────────────────────────────────────────────────
function resolveType$3(value, fieldName, models) {
    if (value === null)
        return 'dynamic';
    if (Array.isArray(value)) {
        if (value.length === 0)
            return 'List<dynamic>';
        const nonNull = value.filter((v) => v !== null);
        const first = nonNull[0] ?? value[0];
        if (typeof first === 'object' && first !== null) {
            // "items" → "Item", "orders" → "Order", else append "Item"
            const nestedName = fieldName.endsWith('s')
                ? fieldName.slice(0, -1)
                : fieldName + 'Item';
            const merged = mergeObjects$3(nonNull.filter((v) => typeof v === 'object'));
            generateModel$1(merged, nestedName, models);
            return `List<${nestedName}>`;
        }
        const elementType = consistentDartPrimitive(value);
        return `List<${elementType}>`;
    }
    if (typeof value === 'object') {
        generateModel$1(value, fieldName, models);
        return fieldName;
    }
    return dartPrimitiveType(value);
}
// ─── Merge helpers ─────────────────────────────────────────────────────────────
function mergeObjects$3(arr) {
    return arr.reduce((acc, obj) => {
        if (typeof obj !== 'object' || obj === null)
            return acc;
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (!(key in acc)) {
                acc[key] = val;
            }
            else if (acc[key] === null && val !== null) {
                acc[key] = val;
            }
            else if (typeof acc[key] !== typeof val &&
                typeof val === 'object' &&
                val !== null) {
                acc[key] = val;
            }
            else if (typeof acc[key] === 'object' &&
                !Array.isArray(acc[key]) &&
                typeof val === 'object' &&
                !Array.isArray(val) &&
                val !== null) {
                acc[key] = mergeObjects$3([acc[key], val]);
            }
        }
        return acc;
    }, {});
}
// ─── Type helpers ──────────────────────────────────────────────────────────────
function dartPrimitiveType(value) {
    switch (typeof value) {
        case 'string': return 'String';
        case 'boolean': return 'bool';
        case 'number': return Number.isInteger(value) ? 'int' : 'double';
        default: return 'dynamic';
    }
}
function consistentDartPrimitive(arr) {
    const types = new Set(arr.map(dartPrimitiveType));
    return types.size === 1 ? [...types][0] : 'dynamic';
}
// ─── Naming helpers ────────────────────────────────────────────────────────────
function toDartFieldName(key) {
    const segments = key.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (segments.length === 0)
        return '_';
    return (segments[0].toLowerCase() +
        segments.slice(1).map(capitalize$5).join(''));
}
function capitalize$5(s) {
    if (!s)
        return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// =============================
// MAIN EXPORT FUNCTION
// =============================
async function convertJsonToExcel(jsonString, fileName = 'data') {
    if (!jsonString.trim()) {
        throw new Error('JSON input is empty.');
    }
    const parsed = JSON.parse(jsonString);
    // Ensure array format (Excel works best with arrays)
    const jsonArray = Array.isArray(parsed) ? parsed : [parsed];
    // Flatten nested objects
    const flattenedData = jsonArray.map(item => flattenObject$1(item));
    // Dynamically import xlsx (better for Angular build size)
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    // Write workbook as binary array
    const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
    });
    // Download file
    const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
    return {
        rowCount: flattenedData.length,
        columnCount: Object.keys(flattenedData[0] || {}).length,
        jsonSize: jsonString.length,
        fileSizeEstimate: excelBuffer.byteLength,
    };
}
// =============================
// FLATTEN HELPER FUNCTION
// =============================
function flattenObject$1(obj, parentKey = '', result = {}) {
    for (const key in obj) {
        if (!obj.hasOwnProperty(key))
            continue;
        const newKey = parentKey ? `${parentKey}.${key}` : key;
        if (typeof obj[key] === 'object' &&
            obj[key] !== null &&
            !Array.isArray(obj[key])) {
            flattenObject$1(obj[key], newKey, result);
        }
        else {
            result[newKey] = Array.isArray(obj[key])
                ? obj[key].join(', ')
                : obj[key];
        }
    }
    return result;
}

function jsonToGoStructFlexible(json, structName = 'AutoGenerated') {
    const structs = new Map();
    if (Array.isArray(json)) {
        if (json.length === 0)
            return `type ${structName} []interface{}`;
        const merged = mergeObjects$2(json);
        generateStruct(merged, structName, structs);
        return buildOutput$2(structs, structName, true);
    }
    else if (typeof json === 'object' && json !== null) {
        generateStruct(json, structName, structs);
        return buildOutput$2(structs, structName, false);
    }
    else {
        throw new Error('Invalid JSON input: must be an object or array');
    }
}
/** Render all collected struct definitions in dependency order */
function buildOutput$2(structs, rootName, isArray) {
    const lines = [];
    // Print nested structs first (all except root), then root last
    for (const [name, body] of structs) {
        if (name !== rootName) {
            lines.push(`type ${name} ${body}\n`);
        }
    }
    const rootBody = structs.get(rootName);
    lines.push(isArray
        ? `type ${rootName} []${rootBody}`
        : `type ${rootName} ${rootBody}`);
    return lines.join('\n');
}
/** Recursively build Go struct body and register all nested structs */
function generateStruct(obj, structName, structs) {
    // Avoid re-generating the same struct (e.g., repeated keys)
    if (structs.has(structName))
        return;
    let body = `struct {\n`;
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        const fieldName = toGoFieldName(key);
        const goType = resolveGoType(value, fieldName, structs);
        body += `\t${fieldName} ${goType} \`json:"${key}"\`\n`;
    }
    body += `}`;
    structs.set(structName, body);
}
/** Resolve the Go type string for a value, recursing for objects/arrays */
function resolveGoType(value, fieldName, structs) {
    // ── null ──────────────────────────────────────────────────────────────────
    if (value === null) {
        return 'interface{}';
    }
    // ── Array ─────────────────────────────────────────────────────────────────
    if (Array.isArray(value)) {
        if (value.length === 0)
            return '[]interface{}';
        const first = value[0];
        if (typeof first === 'object' && first !== null) {
            // Merge ALL array items so every possible field is captured
            const merged = mergeObjects$2(value.filter((v) => v !== null));
            const nestedName = capitalize$4(fieldName) + 'Item';
            generateStruct(merged, nestedName, structs);
            return `[]${nestedName}`;
        }
        // Array of primitives — check if all items share the same primitive type
        const elementType = consistentPrimitiveType(value);
        return `[]${elementType}`;
    }
    // ── Nested object ─────────────────────────────────────────────────────────
    if (typeof value === 'object') {
        const nestedName = capitalize$4(fieldName);
        generateStruct(value, nestedName, structs);
        return nestedName;
    }
    // ── Primitive ─────────────────────────────────────────────────────────────
    return primitiveType(value);
}
/** Merge an array of objects into one representative object */
function mergeObjects$2(arr) {
    return arr.reduce((acc, obj) => {
        if (typeof obj !== 'object' || obj === null)
            return acc;
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (!(key in acc)) {
                // New key — take it as-is
                acc[key] = val;
            }
            else if (acc[key] === null && val !== null) {
                // Prefer a real value over null
                acc[key] = val;
            }
            else if (typeof acc[key] !== typeof val &&
                typeof val === 'object' &&
                val !== null) {
                // Prefer richer object/array type over a primitive
                acc[key] = val;
            }
            else if (typeof acc[key] === 'object' &&
                !Array.isArray(acc[key]) &&
                typeof val === 'object' &&
                !Array.isArray(val) &&
                val !== null) {
                // Both are objects — merge them recursively so no fields are lost
                acc[key] = mergeObjects$2([acc[key], val]);
            }
        }
        return acc;
    }, {});
}
/** Return the primitive Go type if all values share one, otherwise interface{} */
function consistentPrimitiveType(arr) {
    const types = new Set(arr.map(primitiveType));
    return types.size === 1 ? [...types][0] : 'interface{}';
}
function primitiveType(value) {
    switch (typeof value) {
        case 'string':
            return 'string';
        case 'number':
            return Number.isInteger(value) ? 'int' : 'float64';
        case 'boolean':
            return 'bool';
        default:
            return 'interface{}';
    }
}
function toGoFieldName(key) {
    // Split on non-alphanumeric boundaries, capitalise each segment
    return key
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map(capitalize$4)
        .join('');
}
function capitalize$4(s) {
    if (!s)
        return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ------------------------------------ */
/* 🔹 Table Data Model */
/* ------------------------------------ */
/* ------------------------------------ */
/* 🔹 JSON → Table Data (For Angular UI) */
/* ------------------------------------ */
function jsonToTable(jsonString) {
    const parsed = JSON.parse(jsonString);
    let dataArray = [];
    if (Array.isArray(parsed)) {
        dataArray = parsed;
    }
    else if (typeof parsed === 'object' && parsed !== null) {
        dataArray = [parsed];
    }
    else {
        throw new Error('JSON must be an object or array of objects');
    }
    const flattened = dataArray.map(item => flattenObject(item));
    const headerSet = new Set();
    flattened.forEach(obj => Object.keys(obj).forEach(key => headerSet.add(key)));
    return {
        headers: Array.from(headerSet),
        rows: flattened
    };
}
/* ------------------------------------ */
/* 🔹 Table Data → Standalone HTML File */
/* ------------------------------------ */
function tableDataToHtmlDocument(table) {
    const headersHtml = table.headers
        .map(h => `<th>${escapeHtml(h)}</th>`)
        .join('');
    const rowsHtml = table.rows
        .map(row => `
      <tr>
        ${table.headers
        .map(h => `<td>${escapeHtml(row[h] ?? '')}</td>`)
        .join('')}
      </tr>
    `)
        .join('');
    return `

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>JSON Table Export — JSONToAll</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      background: #0d1117;
      color: #d1d5db;
      padding: 40px 32px;
      min-height: 100vh;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
    }

    .brand-name {
      font-size: 14px;
      font-weight: 600;
      color: #60a5fa;
      letter-spacing: 0.02em;
    }

    .export-badge {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6ee7b7;
      background: rgba(52, 211, 153, 0.1);
      border: 1px solid rgba(52, 211, 153, 0.2);
      padding: 4px 12px;
      border-radius: 20px;
    }

    h2 {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 20px;
    }

    /* Table container */
    .table-container {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      overflow: hidden;
    }

    /* Table toolbar */
    .table-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(31, 41, 55, 0.6);
      border-bottom: 1px solid #1f2937;
    }

    .toolbar-dots {
      display: flex;
      gap: 6px;
    }

    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot-red    { background: rgba(239,68,68,0.7); }
    .dot-yellow { background: rgba(234,179,8,0.7); }
    .dot-green  { background: rgba(34,197,94,0.7); }

    .toolbar-label {
      font-size: 12px;
      font-weight: 500;
      color: #9ca3af;
    }

    .html-badge {
      font-size: 11px;
      font-weight: 600;
      color: #fb923c;
      background: rgba(251,146,60,0.1);
      padding: 2px 8px;
      border-radius: 4px;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    thead {
      background: linear-gradient(90deg, rgba(37,99,235,0.3), rgba(37,99,235,0.15));
      position: sticky;
      top: 0;
      z-index: 10;
    }

    thead tr {
      border-bottom: 1px solid rgba(59,130,246,0.3);
    }

    th {
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #93c5fd;
      white-space: nowrap;
    }

    tbody tr {
      border-bottom: 1px solid rgba(255,255,255,0.04);
      transition: background 0.15s ease;
    }

    tbody tr:last-child {
      border-bottom: none;
    }

    tbody tr:hover {
      background: rgba(59,130,246,0.06);
    }

    tbody tr:nth-child(even) {
      background: rgba(255,255,255,0.02);
    }

    td {
      padding: 11px 16px;
      color: #d1d5db;
      vertical-align: middle;
      white-space: nowrap;
    }

    /* Footer */
    .table-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-top: 1px solid #1f2937;
      background: rgba(31,41,55,0.4);
    }

    .footer-text {
      font-size: 11px;
      color: #4b5563;
    }

    .footer-brand {
      font-size: 11px;
      color: #374151;
    }

    .footer-brand span {
      color: #3b82f6;
    }
  </style>
</head>
<body>

  <div class="page-header">
    <div class="brand">
      <div class="brand-dot"></div>
      <span class="brand-name">JSONToAll.tools</span>
    </div>
    <span class="export-badge">HTML Export</span>
  </div>

  <h2>Generated JSON Table</h2>

  <div class="table-container">

    <div class="table-toolbar">
      <div class="toolbar-dots">
        <div class="dot dot-red"></div>
        <div class="dot dot-yellow"></div>
        <div class="dot dot-green"></div>
        <span class="toolbar-label" style="margin-left:8px">output.html</span>
      </div>
      <span class="html-badge">HTML</span>
    </div>

    <div style="overflow-x:auto; overflow-y:auto; max-height: 80vh;">
      <table>
        <thead>
          <tr>${headersHtml}</tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <span class="footer-text">Generated by JSONToAll.tools</span>
      <span class="footer-brand">json<span>toall</span>.tools</span>
    </div>

  </div>

</body>
</html>

`;
}
/* ------------------------------------ */
/* 🔹 Helper: Flatten Nested Objects */
/* ------------------------------------ */
function flattenObject(obj, parentKey = '', result = {}) {
    for (const key in obj) {
        const newKey = parentKey ? `${parentKey}.${key}` : key;
        if (obj[key] &&
            typeof obj[key] === 'object' &&
            !Array.isArray(obj[key])) {
            flattenObject(obj[key], newKey, result);
        }
        else {
            result[newKey] = Array.isArray(obj[key])
                ? JSON.stringify(obj[key])
                : obj[key];
        }
    }
    return result;
}
/* ------------------------------------ */
/* 🔹 Escape HTML */
/* ------------------------------------ */
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function generateHTMLTable(tableData) {
    if (!tableData || !tableData.headers || !tableData.rows) {
        return '';
    }
    const headerRow = tableData.headers
        .map((h) => `<th>${h}</th>`)
        .join('');
    const bodyRows = tableData.rows
        .map((row) => {
        const cols = tableData.headers
            .map((h) => `<td>${row[h] ?? ''}</td>`)
            .join('');
        return `<tr>${cols}</tr>`;
    })
        .join('');
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Table Export</title>
<style>
  body { font-family: Arial; padding: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #4f46e5;
    color: white;
    padding: 10px;
    text-align: left;
  }
  td {
    padding: 8px;
    border-bottom: 1px solid #ddd;
  }<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>JSON Table Export — JSONToAll</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      background: #0d1117;
      color: #d1d5db;
      padding: 40px 32px;
      min-height: 100vh;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
    }

    .brand-name {
      font-size: 14px;
      font-weight: 600;
      color: #60a5fa;
      letter-spacing: 0.02em;
    }

    .export-badge {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6ee7b7;
      background: rgba(52, 211, 153, 0.1);
      border: 1px solid rgba(52, 211, 153, 0.2);
      padding: 4px 12px;
      border-radius: 20px;
    }

    h2 {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 20px;
    }

    /* Table container */
    .table-container {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      overflow: hidden;
    }

    /* Table toolbar */
    .table-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(31, 41, 55, 0.6);
      border-bottom: 1px solid #1f2937;
    }

    .toolbar-dots {
      display: flex;
      gap: 6px;
    }

    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot-red    { background: rgba(239,68,68,0.7); }
    .dot-yellow { background: rgba(234,179,8,0.7); }
    .dot-green  { background: rgba(34,197,94,0.7); }

    .toolbar-label {
      font-size: 12px;
      font-weight: 500;
      color: #9ca3af;
    }

    .html-badge {
      font-size: 11px;
      font-weight: 600;
      color: #fb923c;
      background: rgba(251,146,60,0.1);
      padding: 2px 8px;
      border-radius: 4px;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    thead {
      background: linear-gradient(90deg, rgba(37,99,235,0.3), rgba(37,99,235,0.15));
      position: sticky;
      top: 0;
      z-index: 10;
    }

    thead tr {
      border-bottom: 1px solid rgba(59,130,246,0.3);
    }

    th {
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #93c5fd;
      white-space: nowrap;
    }

    tbody tr {
      border-bottom: 1px solid rgba(255,255,255,0.04);
      transition: background 0.15s ease;
    }

    tbody tr:last-child {
      border-bottom: none;
    }

    tbody tr:hover {
      background: rgba(59,130,246,0.06);
    }

    tbody tr:nth-child(even) {
      background: rgba(255,255,255,0.02);
    }

    td {
      padding: 11px 16px;
      color: #d1d5db;
      vertical-align: middle;
      white-space: nowrap;
    }

    /* Footer */
    .table-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-top: 1px solid #1f2937;
      background: rgba(31,41,55,0.4);
    }

    .footer-text {
      font-size: 11px;
      color: #4b5563;
    }

    .footer-brand {
      font-size: 11px;
      color: #374151;
    }

    .footer-brand span {
      color: #3b82f6;
    }
  </style>
</head>
<body>

  <div class="page-header">
    <div class="brand">
      <div class="brand-dot"></div>
      <span class="brand-name">JSONToAll.tools</span>
    </div>
    <span class="export-badge">HTML Export</span>
  </div>

  <h2>Generated JSON Table</h2>

  <div class="table-container">

    <div class="table-toolbar">
      <div class="toolbar-dots">
        <div class="dot dot-red"></div>
        <div class="dot dot-yellow"></div>
        <div class="dot dot-green"></div>
        <span class="toolbar-label" style="margin-left:8px">output.html</span>
      </div>
      <span class="html-badge">HTML</span>
    </div>

    <div style="overflow-x:auto; overflow-y:auto; max-height: 80vh;">
      <table>
        <thead>
          <tr>${headerRow}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <span class="footer-text">Generated by JSONToAll.tools</span>
      <span class="footer-brand">json<span>toall</span>.tools</span>
    </div>

  </div>

</body>
</html>
`;
}

function jsonToTsInterfaces(jsonInput, rootName = 'RootObjects') {
    const parsed = typeof jsonInput === 'string' ? safelyParseJSON(jsonInput) : jsonInput;
    if (!parsed || typeof parsed !== 'object') {
        return '// ❌ Invalid JSON input';
    }
    const interfaces = new Map();
    if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
            const itemInterfaceName = singularize$1(rootName);
            return `export interface ${itemInterfaceName} {}\n\nexport type ${rootName} = ${itemInterfaceName}[];`;
        }
        // Use a distinct name for the interface representing array elements
        const arrayItemInterfaceName = singularize$1(rootName);
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
        const outputParts = [];
        if (itemInterfaceLines.length > 0) {
            outputParts.push(`export interface ${arrayItemInterfaceName} {\n${itemInterfaceLines.join('\n')}\n}`);
        }
        if (generatedInterfaces) {
            outputParts.push(generatedInterfaces);
        }
        outputParts.push(rootTypeDefinition);
        return outputParts.join('\n\n');
    }
    else { // Handle single object as root
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
function safelyParseJSON(jsonString) {
    try {
        return JSON.parse(jsonString);
    }
    catch {
        return null;
    }
}
function buildInterface(obj, name, interfaces) {
    if (interfaces.has(name)) {
        return;
    }
    const lines = [];
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        const type = inferType(value, capitalize$3(key), interfaces);
        lines.push(`  ${key}: ${type};`);
    }
    interfaces.set(name, lines);
}
function inferType(value, childName, interfaces) {
    if (value === null)
        return 'any';
    if (Array.isArray(value)) {
        if (value.length === 0)
            return 'any[]';
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
function capitalize$3(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function singularize$1(str) {
    // A more robust singularize might be needed for irregular plurals
    return str.endsWith('s') && str.length > 1 && !str.endsWith('ss') ? str.slice(0, -1) : str;
}

// ============================================
// JSON TO JAVA CLASS CONVERTER UTILITY
// ============================================
// src/app/utils/json-to-java.util.ts
/**
 * Convert JSON string to Java class code
 * @param jsonString - JSON string input
 * @returns Java class code
 */
function jsonToJavaClass(jsonString) {
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
    }
    catch (error) {
        throw new Error('Invalid JSON format: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}
/**
 * Generate class name from JSON structure
 */
function generateClassName(obj) {
    if (obj.name && typeof obj.name === 'string') {
        return toPascalCase$2(obj.name);
    }
    if (obj.type && typeof obj.type === 'string') {
        return toPascalCase$2(obj.type);
    }
    return 'Application';
}
/**
 * Convert string to PascalCase
 */
function toPascalCase$2(str) {
    return str
        .split(/[\s_-]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}
/**
 * Convert string to camelCase
 */
function toCamelCase(str) {
    const pascal = toPascalCase$2(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
/**
 * Singularize a word (remove plural 's')
 */
function singularize(word) {
    if (word.endsWith('ies'))
        return word.slice(0, -3) + 'y';
    if (word.endsWith('es'))
        return word.slice(0, -2);
    if (word.endsWith('s'))
        return word.slice(0, -1);
    return word;
}
/**
 * Get Java type for a given value
 */
function getJavaType(value) {
    if (value === null)
        return 'Object';
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
function getJavaWrapperType(value) {
    if (value === null)
        return 'Object';
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
function getArrayType(arr) {
    if (arr.length === 0)
        return 'List<Object>';
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
function generateJavaClass(className, obj, isNested) {
    let code = '';
    const nestedClasses = [];
    const fields = [];
    // Class declaration
    code += `public class ${className} {\n`;
    // Generate fields
    for (const [key, value] of Object.entries(obj)) {
        const fieldName = sanitizeFieldName(key);
        // Handle nested objects
        if (isNestedObject(value)) {
            const nestedClassName = toPascalCase$2(key);
            fields.push({ key: fieldName, type: nestedClassName, wrapperType: nestedClassName });
            code += `  private ${nestedClassName} ${fieldName};\n`;
            nestedClasses.push(generateJavaClass(nestedClassName, value, true));
        }
        // Handle arrays of objects
        else if (isArrayOfObjects(value)) {
            const nestedClassName = toPascalCase$2(singularize(key));
            const listType = `List<${nestedClassName}>`;
            fields.push({ key: fieldName, type: listType, wrapperType: listType });
            code += `  private ${listType} ${fieldName};\n`;
            const firstElement = value[0];
            if (firstElement) {
                nestedClasses.push(generateJavaClass(nestedClassName, firstElement, true));
            }
        }
        // Handle primitive types and simple arrays
        else {
            const javaType = getJavaType(value);
            const wrapperType = getJavaWrapperType(value);
            fields.push({ key: fieldName, type: javaType, wrapperType: wrapperType });
            code += `  private ${javaType} ${fieldName};\n`;
        }
    }
    // Getter Methods
    code += ' // Getter Methods \n';
    for (const field of fields) {
        const methodName = `get${toPascalCase$2(field.key)}`;
        code += `  public ${field.wrapperType} ${methodName}() {\n`;
        code += `    return ${field.key};\n`;
        code += `  }\n`;
    }
    // Setter Methods
    code += ' // Setter Methods \n';
    for (const field of fields) {
        const methodName = `set${toPascalCase$2(field.key)}`;
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
function sanitizeFieldName(name) {
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
function isNestedObject(value) {
    return typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value);
}
/**
 * Check if value is an array of objects with safe type checking
 */
function isArrayOfObjects(value) {
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

// =============================
// TYPES
// =============================
// =============================
// MAIN EXPORT FUNCTION
// =============================
function convertJsonToKotlin(jsonString, rootClassName = 'RootModel', nullable = false) {
    const parsed = JSON.parse(jsonString);
    const classMap = new Map();
    generateClass$2(rootClassName, parsed, classMap, nullable);
    return Array.from(classMap.values()).join('\n\n');
}
// =============================
// CLASS GENERATOR
// =============================
function generateClass$2(className, obj, classMap, nullable) {
    if (classMap.has(className))
        return;
    if (Array.isArray(obj)) {
        if (obj.length > 0) {
            generateClass$2(className, obj[0], classMap, nullable);
        }
        return;
    }
    if (typeof obj !== 'object' || obj === null)
        return;
    const properties = [];
    for (const key in obj) {
        const value = obj[key];
        const propertyType = resolveType$2(key, value, classMap, nullable);
        const optionalMark = nullable ? '?' : '';
        properties.push(`    val ${key}: ${propertyType}${optionalMark}`);
    }
    const classDefinition = `data class ${className}(\n${properties.join(',\n')}\n)`;
    classMap.set(className, classDefinition);
}
// =============================
// TYPE RESOLVER
// =============================
function resolveType$2(key, value, classMap, nullable) {
    if (value === null)
        return 'Any';
    if (Array.isArray(value)) {
        if (value.length === 0)
            return 'List<Any>';
        const first = value[0];
        if (typeof first === 'object' && first !== null) {
            const className = capitalize$2(key);
            generateClass$2(className, first, classMap, nullable);
            return `List<${className}>`;
        }
        return `List<${resolvePrimitive$1(first)}>`;
    }
    if (typeof value === 'object') {
        const className = capitalize$2(key);
        generateClass$2(className, value, classMap, nullable);
        return className;
    }
    return resolvePrimitive$1(value);
}
// =============================
// PRIMITIVE MAPPING
// =============================
function resolvePrimitive$1(value) {
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
function capitalize$2(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function jsonToMongoQuery(json, collectionName = 'collection') {
    if (Array.isArray(json)) {
        const docs = json.map((item) => formatMongoObject(item)).join(',\n');
        return `db.${collectionName}.insertMany([\n${docs}\n]);`;
    }
    if (typeof json === 'object' && json !== null) {
        return `db.${collectionName}.insertOne(${formatMongoObject(json)});`;
    }
    throw new Error('Invalid JSON input');
}
function formatMongoObject(obj, indent = 2) {
    const spacing = ' '.repeat(indent);
    const entries = Object.entries(obj).map(([key, value]) => {
        return `${spacing}${key}: ${formatMongoValue(value, indent + 2)}`;
    });
    return `{\n${entries.join(',\n')}\n${' '.repeat(indent - 2)}}`;
}
function formatMongoValue(value, indent) {
    if (value === null)
        return 'null';
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

function jsonToMongooseModel(obj, modelName = "Model") {
    if (Array.isArray(obj)) {
        obj = obj[0]; // use first item for schema
    }
    const schemaBody = generateSchema(obj, 2);
    return `const mongoose = require("mongoose");

const ${modelName}Schema = new mongoose.Schema(${schemaBody});

module.exports = mongoose.model("${modelName}", ${modelName}Schema);`;
}
function generateSchema(obj, indent) {
    const space = " ".repeat(indent);
    let schema = "{\n";
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        schema += `${space}${key}: ${resolveType$1(value, indent + 2)},\n`;
    }
    schema += "}";
    return schema;
}
function resolveType$1(value, indent) {
    if (Array.isArray(value)) {
        if (value.length === 0)
            return "[{ type: mongoose.Schema.Types.Mixed }]";
        return `[{ type: ${mapPrimitive(value[0])} }]`;
    }
    if (typeof value === "object" && value !== null) {
        return generateSchema(value, indent);
    }
    return `{ type: ${mapPrimitive(value)} }`;
}
function mapPrimitive(value) {
    switch (typeof value) {
        case "string":
            return "String";
        case "number":
            return "Number";
        case "boolean":
            return "Boolean";
        default:
            return "mongoose.Schema.Types.Mixed";
    }
}

function jsonToPhpArray(json, className = 'AutoGenerated') {
    const classes = new Map();
    if (Array.isArray(json)) {
        if (json.length === 0)
            return `// Empty array — no class generated`;
        const merged = mergeObjects$1(json);
        generateClass$1(merged, className, classes);
    }
    else if (typeof json === 'object' && json !== null) {
        generateClass$1(json, className, classes);
    }
    else {
        throw new Error('Invalid JSON input: must be an object or array');
    }
    return buildOutput$1(classes);
}
// ─── Output builder ────────────────────────────────────────────────────────────
function buildOutput$1(classes) {
    return `<?php\n\n` + [...classes.values()].join('\n\n');
}
// ─── Class generator ───────────────────────────────────────────────────────────
function generateClass$1(obj, className, classes) {
    if (classes.has(className))
        return;
    // Reserve immediately to break circular references
    classes.set(className, '');
    const properties = [];
    const fromArrayLines = [];
    const toArrayLines = [];
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        const phpName = toPhpFieldName(key);
        const phpType = resolvePhpType(value, toPascalCase$1(phpName), classes);
        const docType = toDocType(phpType, value);
        // ── Property declaration ───────────────────────────────────────────────
        properties.push(`    /** @var ${docType} */`);
        properties.push(`    public $${phpName};`);
        properties.push(``);
        // ── fromArray ──────────────────────────────────────────────────────────
        fromArrayLines.push(...buildFromArrayLines(key, phpName, phpType, value));
        // ── toArray ────────────────────────────────────────────────────────────
        toArrayLines.push(...buildToArrayLines(key, phpName, phpType, value));
    }
    const body = [
        `class ${className}`,
        `{`,
        ...properties,
        `    /**`,
        `     * @param array $data`,
        `     * @return static`,
        `     */`,
        `    public static function fromArray(array $data): static`,
        `    {`,
        `        $instance = new static();`,
        ...fromArrayLines,
        `        return $instance;`,
        `    }`,
        ``,
        `    /**`,
        `     * @return array`,
        `     */`,
        `    public function toArray(): array`,
        `    {`,
        `        $data = [];`,
        ...toArrayLines,
        `        return $data;`,
        `    }`,
        `}`,
    ].join('\n');
    classes.set(className, body);
}
// ─── fromArray line builder ────────────────────────────────────────────────────
function buildFromArrayLines(jsonKey, phpName, phpType, value) {
    // List of model objects
    if (phpType.startsWith('array<')) {
        const innerType = phpType.slice(6, -1); // strip array< >
        const isPrimitive = ['string', 'int', 'float', 'bool', 'mixed'].includes(innerType);
        if (!isPrimitive) {
            return [
                `        if (isset($data['${jsonKey}']) && is_array($data['${jsonKey}'])) {`,
                `            $instance->${phpName} = [];`,
                `            foreach ($data['${jsonKey}'] as $item) {`,
                `                $instance->${phpName}[] = ${innerType}::fromArray($item);`,
                `            }`,
                `        }`,
            ];
        }
        else {
            return [
                `        $instance->${phpName} = $data['${jsonKey}'] ?? [];`,
            ];
        }
    }
    // Nested model object
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return [
            `        if (isset($data['${jsonKey}'])) {`,
            `            $instance->${phpName} = ${phpType}::fromArray($data['${jsonKey}']);`,
            `        }`,
        ];
    }
    // Primitive / null
    return [`        $instance->${phpName} = $data['${jsonKey}'] ?? null;`];
}
// ─── toArray line builder ──────────────────────────────────────────────────────
function buildToArrayLines(jsonKey, phpName, phpType, value) {
    // List of model objects
    if (phpType.startsWith('array<')) {
        const innerType = phpType.slice(6, -1);
        const isPrimitive = ['string', 'int', 'float', 'bool', 'mixed'].includes(innerType);
        if (!isPrimitive) {
            return [
                `        if ($this->${phpName} !== null) {`,
                `            $data['${jsonKey}'] = array_map(fn($item) => $item->toArray(), $this->${phpName});`,
                `        }`,
            ];
        }
        else {
            return [`        $data['${jsonKey}'] = $this->${phpName};`];
        }
    }
    // Nested model object
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return [
            `        if ($this->${phpName} !== null) {`,
            `            $data['${jsonKey}'] = $this->${phpName}->toArray();`,
            `        }`,
        ];
    }
    // Primitive
    return [`        $data['${jsonKey}'] = $this->${phpName};`];
}
// ─── Type resolver ─────────────────────────────────────────────────────────────
function resolvePhpType(value, fieldName, classes) {
    if (value === null)
        return 'mixed';
    if (Array.isArray(value)) {
        if (value.length === 0)
            return 'array<mixed>';
        const nonNull = value.filter((v) => v !== null);
        const first = nonNull[0] ?? value[0];
        if (typeof first === 'object' && first !== null) {
            const nestedName = fieldName.endsWith('s')
                ? fieldName.slice(0, -1)
                : fieldName + 'Item';
            const merged = mergeObjects$1(nonNull.filter((v) => typeof v === 'object'));
            generateClass$1(merged, nestedName, classes);
            return `array<${nestedName}>`;
        }
        const elementType = consistentPhpPrimitive(value);
        return `array<${elementType}>`;
    }
    if (typeof value === 'object') {
        generateClass$1(value, fieldName, classes);
        return fieldName;
    }
    return phpPrimitiveType(value);
}
// ─── Doc type helper ───────────────────────────────────────────────────────────
function toDocType(phpType, value) {
    if (phpType.startsWith('array<')) {
        const innerType = phpType.slice(6, -1);
        return `${innerType}[]|null`;
    }
    if (value === null)
        return 'mixed';
    return `${phpType}|null`;
}
// ─── Merge helpers ─────────────────────────────────────────────────────────────
function mergeObjects$1(arr) {
    return arr.reduce((acc, obj) => {
        if (typeof obj !== 'object' || obj === null)
            return acc;
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (!(key in acc)) {
                acc[key] = val;
            }
            else if (acc[key] === null && val !== null) {
                acc[key] = val;
            }
            else if (typeof acc[key] !== typeof val &&
                typeof val === 'object' &&
                val !== null) {
                acc[key] = val;
            }
            else if (typeof acc[key] === 'object' &&
                !Array.isArray(acc[key]) &&
                typeof val === 'object' &&
                !Array.isArray(val) &&
                val !== null) {
                acc[key] = mergeObjects$1([acc[key], val]);
            }
        }
        return acc;
    }, {});
}
// ─── Type helpers ──────────────────────────────────────────────────────────────
function phpPrimitiveType(value) {
    switch (typeof value) {
        case 'string': return 'string';
        case 'boolean': return 'bool';
        case 'number': return Number.isInteger(value) ? 'int' : 'float';
        default: return 'mixed';
    }
}
function consistentPhpPrimitive(arr) {
    const types = new Set(arr.map(phpPrimitiveType));
    return types.size === 1 ? [...types][0] : 'mixed';
}
// ─── Naming helpers ────────────────────────────────────────────────────────────
/** snake_case / kebab-case / spaces → camelCase PHP property name */
function toPhpFieldName(key) {
    const segments = key.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (segments.length === 0)
        return '_';
    return (segments[0].toLowerCase() +
        segments.slice(1).map(capitalize$1).join(''));
}
/** camelCase → PascalCase for class names */
function toPascalCase$1(name) {
    return capitalize$1(name);
}
function capitalize$1(s) {
    if (!s)
        return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// =============================
// MAIN EXPORT FUNCTION
// =============================
function convertJsonToPython(jsonString, rootClassName = 'RootModel') {
    const parsed = JSON.parse(jsonString);
    const classMap = new Map();
    const typingImports = new Set();
    if (Array.isArray(parsed)) {
        if (parsed.length > 0 && isPlainObject$1(parsed[0])) {
            generateClass(parsed[0], rootClassName, classMap, typingImports);
        }
    }
    else {
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
function generateClass(obj, className, classMap, typingImports) {
    if (!isPlainObject$1(obj) || classMap.has(className))
        return;
    const properties = [];
    const constructorParams = [];
    const constructorBody = [];
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
    }
    else {
        classCode += properties.join('\n') + '\n\n';
        classCode += `    def __init__(self, ${constructorParams.join(', ')}) -> None:\n`;
        classCode += constructorBody.join('\n');
    }
    classMap.set(className, classCode);
}
// =============================
// TYPE RESOLUTION
// =============================
function resolveType(value, propertyName, classMap, typingImports) {
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
        if (isPlainObject$1(first)) {
            const childClass = toPascalCase(propertyName);
            generateClass(first, childClass, classMap, typingImports);
            return `List[${childClass}]`;
        }
        return `List[${resolvePrimitive(first, typingImports)}]`;
    }
    // OBJECT
    if (isPlainObject$1(value)) {
        const childClassName = toPascalCase(propertyName);
        generateClass(value, childClassName, classMap, typingImports);
        return childClassName;
    }
    return resolvePrimitive(value, typingImports);
}
// =============================
// PRIMITIVES
// =============================
function resolvePrimitive(value, typingImports) {
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
function isPlainObject$1(obj) {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}
function toPascalCase(str) {
    return str
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('');
}
function toSafePythonName(name) {
    const reserved = new Set([
        'class', 'def', 'return', 'from', 'import', 'as',
        'if', 'else', 'elif', 'for', 'while', 'try',
        'except', 'with', 'lambda', 'pass', 'break',
        'continue', 'global', 'nonlocal', 'assert'
    ]);
    if (reserved.has(name))
        return name + '_';
    return name;
}
// =============================
// COMPARISON
// =============================
function calculateComparison$1(jsonString, pythonString) {
    const jsonTokens = countTokens$1(jsonString);
    const pythonTokens = countTokens$1(pythonString);
    const jsonSize = new Blob([jsonString]).size;
    const pythonSize = new Blob([pythonString]).size;
    const savings = jsonSize > 0
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
function countTokens$1(text) {
    const tokens = text.match(/\w+|[{}[\];,.<>():]/g);
    return tokens ? tokens.length : 0;
}
// =============================
// VALIDATION
// =============================
function isValidJson$1(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch {
        return false;
    }
}

// export type SupportedDB = 'mysql' | 'postgres' | 'sqlserver' | 'sqlite';
function convertJsonToSqlWithSchema(jsonInput, options) {
    const { tableName, includeCreateTable = true } = options;
    if (!tableName) {
        throw new Error('Table name is required.');
    }
    const data = typeof jsonInput === 'string'
        ? JSON.parse(jsonInput)
        : jsonInput;
    const rows = Array.isArray(data) ? data : [data];
    if (!rows.length) {
        throw new Error('JSON data is empty.');
    }
    const columns = extractColumns(rows);
    let sql = '';
    // ✅ CREATE TABLE
    if (includeCreateTable) {
        const columnDefinitions = columns
            .map(col => `"${col}" ${detectSqlType(rows, col)}`)
            .join(',\n  ');
        sql += `CREATE TABLE "${tableName}" (\n  ${columnDefinitions}\n);\n\n`;
    }
    // ✅ INSERT INTO
    const columnList = columns.map(col => `"${col}"`).join(',');
    const valuesList = rows.map(row => {
        const values = columns.map(col => formatValue$1(row[col]));
        return `(${values.join(',')})`;
    });
    sql += `INSERT INTO "${tableName}" (${columnList})\nVALUES\n${valuesList.join(',\n')};`;
    return sql;
}
/* ---------------------------------- */
/* Helpers */
/* ---------------------------------- */
function extractColumns(rows) {
    const columnSet = new Set();
    rows.forEach(row => {
        Object.keys(row).forEach(key => columnSet.add(key));
    });
    return Array.from(columnSet);
}
function detectSqlType(rows, column) {
    for (const row of rows) {
        const value = row[column];
        if (value === null || value === undefined)
            continue;
        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'bigint' : 'double precision';
        }
        if (typeof value === 'boolean') {
            return 'boolean';
        }
        if (typeof value === 'object') {
            return 'jsonb';
        }
        return 'text';
    }
    return 'text';
}
function formatValue$1(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    if (typeof value === 'number') {
        return value.toString();
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (typeof value === 'object') {
        return `'${escapeString(JSON.stringify(value))}'`;
    }
    return `'${escapeString(String(value))}'`;
}
function escapeString(value) {
    return value.replace(/'/g, "''");
}

function jsonToSwiftModel(json, modelName = 'AutoGenerated') {
    const models = new Map();
    if (Array.isArray(json)) {
        if (json.length === 0)
            return `// Empty array — no model generated`;
        const merged = mergeObjects(json);
        generateModel(merged, modelName, models);
    }
    else if (typeof json === 'object' && json !== null) {
        generateModel(json, modelName, models);
    }
    else {
        throw new Error('Invalid JSON input: must be an object or array');
    }
    return buildOutput(models);
}
// ─── Output builder ────────────────────────────────────────────────────────────
/** Emit nested models first, root model last */
function buildOutput(models) {
    return [...models.values()].join('\n\n');
}
// ─── Model generator ───────────────────────────────────────────────────────────
function generateModel(obj, modelName, models) {
    if (models.has(modelName))
        return;
    // Reserve the name immediately to break circular references
    models.set(modelName, '');
    const properties = [];
    const codingKeys = [];
    let needsCodingKeys = false;
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        const swiftName = toSwiftFieldName(key);
        const swiftType = resolveSwiftType(value, capitalize(swiftName), models);
        properties.push(`    var ${swiftName}: ${swiftType}`);
        // CodingKeys are needed when the JSON key differs from the Swift name
        codingKeys.push(`        case ${swiftName} = "${key}"`);
        if (swiftName !== key)
            needsCodingKeys = true;
    }
    // Always emit CodingKeys for explicit mapping (good practice)
    const codingKeysBlock = [
        `    enum CodingKeys: String, CodingKey {`,
        ...codingKeys,
        `    }`,
    ].join('\n');
    const body = [
        `struct ${modelName}: Codable {`,
        ...properties,
        ``,
        codingKeysBlock,
        `}`,
    ].join('\n');
    models.set(modelName, body);
}
// ─── Type resolver ─────────────────────────────────────────────────────────────
function resolveSwiftType(value, fieldName, models) {
    // null → optional Any
    if (value === null)
        return 'Any?';
    // Array
    if (Array.isArray(value)) {
        if (value.length === 0)
            return '[Any]';
        const first = value[0];
        if (typeof first === 'object' && first !== null) {
            const nestedName = fieldName + 'Item';
            const merged = mergeObjects(value.filter((v) => v !== null && typeof v === 'object'));
            generateModel(merged, nestedName, models);
            return `[${nestedName}]`;
        }
        const elementType = consistentSwiftPrimitive(value);
        return `[${elementType}]`;
    }
    // Nested object
    if (typeof value === 'object') {
        generateModel(value, fieldName, models);
        return fieldName;
    }
    // Primitive
    return swiftPrimitiveType(value);
}
// ─── Merge helpers ─────────────────────────────────────────────────────────────
function mergeObjects(arr) {
    return arr.reduce((acc, obj) => {
        if (typeof obj !== 'object' || obj === null)
            return acc;
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (!(key in acc)) {
                acc[key] = val;
            }
            else if (acc[key] === null && val !== null) {
                acc[key] = val;
            }
            else if (typeof acc[key] !== typeof val &&
                typeof val === 'object' &&
                val !== null) {
                acc[key] = val;
            }
            else if (typeof acc[key] === 'object' &&
                !Array.isArray(acc[key]) &&
                typeof val === 'object' &&
                !Array.isArray(val) &&
                val !== null) {
                acc[key] = mergeObjects([acc[key], val]);
            }
        }
        return acc;
    }, {});
}
// ─── Type helpers ──────────────────────────────────────────────────────────────
function swiftPrimitiveType(value) {
    switch (typeof value) {
        case 'string': return 'String';
        case 'boolean': return 'Bool';
        case 'number': return Number.isInteger(value) ? 'Int' : 'Double';
        default: return 'Any';
    }
}
function consistentSwiftPrimitive(arr) {
    const types = new Set(arr.map(swiftPrimitiveType));
    return types.size === 1 ? [...types][0] : 'Any';
}
// ─── Naming helpers ────────────────────────────────────────────────────────────
/**
 * Convert any JSON key to lowerCamelCase Swift identifier.
 * snake_case, kebab-case, spaces, dots — all handled.
 */
function toSwiftFieldName(key) {
    const segments = key.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (segments.length === 0)
        return '_';
    return (segments[0].toLowerCase() +
        segments
            .slice(1)
            .map(capitalize)
            .join(''));
}
function capitalize(s) {
    if (!s)
        return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function jsonToToml(obj, parentKey = '') {
    let tomlString = '';
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    tomlString += `[${fullKey}.${index}]\n`;
                    tomlString += jsonToToml(item, `${fullKey}.${index}`);
                }
                else {
                    tomlString += `${fullKey} = ${formatTomlValue(item)}\n`;
                }
            });
        }
        else if (typeof value === 'object' && value !== null) {
            tomlString += `[${fullKey}]\n`;
            tomlString += jsonToToml(value, fullKey);
        }
        else {
            tomlString += `${fullKey} = ${formatTomlValue(value)}\n`;
        }
    }
    return tomlString;
}
function formatTomlValue(value) {
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

// Main export function - Convert JSON string to TOON format
function convertJsonToToon(jsonString) {
    const parsed = JSON.parse(jsonString);
    return objectToToon(parsed, 0);
}
// Convert object to TOON format recursively
function objectToToon(obj, indentLevel = 0) {
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
function arrayToToon(arr, indentLevel) {
    if (arr.length === 0)
        return '[]';
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
function objectStructureToToon(obj, indentLevel) {
    const indent = '  '.repeat(indentLevel);
    const keys = Object.keys(obj);
    if (keys.length === 0)
        return '{}';
    let result = '';
    keys.forEach((key, index) => {
        const value = obj[key];
        if (value === null || typeof value !== 'object') {
            // Simple key-value
            result += indent + key + ': ' + primitiveToToon(value);
        }
        else if (Array.isArray(value)) {
            // Array
            result += indent + key + arrayToToon(value, indentLevel);
        }
        else {
            // Nested object
            result += indent + key + ':\n' + objectStructureToToon(value, indentLevel + 1);
        }
        if (index < keys.length - 1)
            result += '\n';
    });
    return result;
}
// Convert primitive value to TOON format
function primitiveToToon(value) {
    if (value === null)
        return 'null';
    if (typeof value === 'string') {
        // Only quote if necessary (contains comma, colon, or special chars)
        if (needsQuotes(value)) {
            return '"' + value.replace(/"/g, '\\"') + '"';
        }
        return value;
    }
    if (typeof value === 'number')
        return value.toString();
    if (typeof value === 'boolean')
        return value.toString();
    return String(value);
}
// Check if string needs quotes
function needsQuotes(str) {
    return /[,:"\n\r\t]|^\s|\s$/.test(str) || str === '' || str === 'null' || str === 'true' || str === 'false';
}
// Check if array contains uniform objects
function isUniformObjectArray(arr) {
    if (arr.length === 0)
        return false;
    if (!isPlainObject(arr[0]))
        return false;
    const firstKeys = Object.keys(arr[0]).sort().join(',');
    return arr.every(item => isPlainObject(item) &&
        Object.keys(item).sort().join(',') === firstKeys);
}
// Check if array contains only primitives
function isPrimitiveArray(arr) {
    return arr.every(item => item === null ||
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean');
}
// Check if value is plain object
function isPlainObject(obj) {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}
// Calculate comparison statistics
function calculateComparison(jsonString, toonString) {
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
function countTokens(text) {
    const tokens = text.match(/\w+|[{}[\]:,]/g);
    return tokens ? tokens.length : 0;
}
// Validate JSON
function isValidJson(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch {
        return false;
    }
}

// json-to-xml.util.ts
function jsonToXmlSafe(input, rootName = 'root') {
    // --- Helper: Decode HTML entities ---
    const decodeHtmlEntities = (s) => s
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    // --- Helper: Convert JS-like object to valid JSON ---
    const toValidJsonString = (s) => {
        return s
            .trim()
            .replace(/^\{?/, '{') // ensure starts with {
            .replace(/;?\s*$/, '') // remove trailing semicolon
            .replace(/([{,]\s*)([A-Za-z0-9_\-]+)\s*:/g, '$1"$2":') // quote keys
            .replace(/'([^']*)'/g, (_m, g1) => `"${g1.replace(/"/g, '\\"')}"`); // single → double quotes
    };
    // --- Helper: Escape XML special chars ---
    const escapeXml = (v) => v.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    // --- Recursive JSON → XML ---
    const convert = (obj, tagName) => {
        if (obj === null || obj === undefined) {
            return tagName ? `<${tagName}/>` : '';
        }
        if (typeof obj !== 'object') {
            return tagName ? `<${tagName}>${escapeXml(String(obj))}</${tagName}>` : escapeXml(String(obj));
        }
        if (Array.isArray(obj)) {
            return obj.map(item => convert(item, tagName)).join('');
        }
        const inner = Object.entries(obj).map(([k, v]) => convert(v, k)).join('');
        return tagName ? `<${tagName}>${inner}</${tagName}>` : inner;
    };
    // --- Pretty-print XML ---
    const formatXML = (xml) => {
        const PADDING = '  ';
        let pad = 0;
        return xml
            .replace(/(>)(<)(\/*)/g, '$1\r\n$2$3')
            .split('\r\n')
            .map(node => {
            let indent = 0;
            if (node.match(/.+<\/\w[^>]*>$/)) {
                indent = 0;
            }
            else if (node.match(/^<\/\w/)) {
                if (pad > 0)
                    pad -= 1;
            }
            else if (node.match(/^<\w/)) {
                indent = 1;
            }
            const line = PADDING.repeat(pad) + node;
            pad += indent;
            return line;
        })
            .join('\n');
    };
    // --- Main: parse input into object ---
    let jsonObject;
    if (typeof input === 'object') {
        jsonObject = input;
    }
    else {
        let str = decodeHtmlEntities(String(input).trim());
        // Remove <root> wrappers if present
        const match = str.match(/^<([a-zA-Z0-9_-]+)>([\s\S]*)<\/\1>$/);
        if (match)
            str = match[2].trim();
        try {
            jsonObject = JSON.parse(str);
        }
        catch {
            try {
                jsonObject = JSON.parse(toValidJsonString(str));
            }
            catch {
                throw new Error('Invalid input: Cannot parse to JSON.');
            }
        }
    }
    // --- Build and format XML ---
    const rawXml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>${convert(jsonObject)}</${rootName}>`;
    return formatXML(rawXml);
}

function jsonToYaml(input, indent = 0) {
    // If input is a string, parse JSON safely
    let data = input;
    if (typeof input === 'string') {
        try {
            data = JSON.parse(input);
        }
        catch (e) {
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
            }
            else {
                yaml += `${spaces}- ${formatValue(item)}\n`;
            }
        }
    }
    else if (isObject(data)) {
        for (const key of Object.keys(data)) {
            const value = data[key];
            if (isObject(value) || Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                yaml += jsonToYaml(value, indent + 2);
            }
            else {
                yaml += `${spaces}${key}: ${formatValue(value)}\n`;
            }
        }
    }
    else {
        // primitive values
        return `${spaces}${formatValue(data)}\n`;
    }
    return yaml;
}
function isObject(val) {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
}
function formatValue(value) {
    if (typeof value === 'string') {
        if (/[^a-zA-Z0-9_\- ]/.test(value)) {
            return `"${value.replace(/"/g, '\\"')}"`;
        }
        return value;
    }
    if (value === null)
        return "null";
    if (typeof value === 'boolean')
        return value.toString();
    return String(value);
}

/*
 * Public API Surface of shared-utils
 */

/**
 * Generated bundle index. Do not edit.
 */

export { calculateComparison$2 as calculateComparison, convertJsonToCSharp, convertJsonToExcel, convertJsonToKotlin, convertJsonToPython, convertJsonToSqlWithSchema, convertJsonToToon, generateHTMLTable, isValidJson$2 as isValidJson, jsonToCsv, jsonToDartModel, jsonToGoStructFlexible, jsonToJavaClass, jsonToMongoQuery, jsonToMongooseModel, jsonToPhpArray, jsonToSwiftModel, jsonToTable, jsonToToml, jsonToTsInterfaces, jsonToXmlSafe, jsonToYaml, tableDataToHtmlDocument };
//# sourceMappingURL=jsontoall-shared-utils.mjs.map
