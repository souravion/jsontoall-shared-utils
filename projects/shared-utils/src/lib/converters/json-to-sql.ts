// export type SupportedDB = 'mysql' | 'postgres' | 'sqlserver' | 'sqlite';

// export interface JsonToSqlOptions {
//   tableName: string;
//   db?: SupportedDB;
//   pretty?: boolean;
// }

// export function convertJsonToSql(
//   jsonInput: string | object,
//   options: JsonToSqlOptions
// ): string {
//   const { tableName, db = 'mysql', pretty = true } = options;

//   if (!tableName) {
//     throw new Error('Table name is required.');
//   }

//   const data = typeof jsonInput === 'string'
//     ? JSON.parse(jsonInput)
//     : jsonInput;

//   const rows = Array.isArray(data) ? data : [data];

//   if (!rows.length) {
//     throw new Error('JSON data is empty.');
//   }

//   const columns = extractColumns(rows);
//   const columnList = columns.map(col => wrapIdentifier(col, db)).join(', ');

//   const valuesList = rows.map(row => {
//     const values = columns.map(col =>
//       formatValue(row[col], db)
//     );
//     return `(${values.join(', ')})`;
//   });

//   const separator = pretty ? ',\n' : ',';
//   const valuesSection = valuesList.join(separator);

//   return `INSERT INTO ${wrapIdentifier(tableName, db)} (${columnList})\nVALUES\n${valuesSection};`;
// }

// /* ---------------------------------- */
// /* Helpers */
// /* ---------------------------------- */

// function extractColumns(rows: any[]): string[] {
//   const columnSet = new Set<string>();

//   rows.forEach(row => {
//     Object.keys(row).forEach(key => columnSet.add(key));
//   });

//   return Array.from(columnSet);
// }

// function formatValue(value: any, db: SupportedDB): string {
//   if (value === null || value === undefined) {
//     return 'NULL';
//   }

//   if (typeof value === 'number') {
//     return value.toString();
//   }

//   if (typeof value === 'boolean') {
//     if (db === 'postgres') return value ? 'TRUE' : 'FALSE';
//     return value ? '1' : '0';
//   }

//   if (typeof value === 'object') {
//     return `'${escapeString(JSON.stringify(value))}'`;
//   }

//   return `'${escapeString(String(value))}'`;
// }

// function escapeString(value: string): string {
//   return value.replace(/'/g, "''");
// }

// function wrapIdentifier(identifier: string, db: SupportedDB): string {
//   switch (db) {
//     case 'mysql':
//     case 'sqlite':
//       return `\`${identifier}\``;
//     case 'postgres':
//       return `"${identifier}"`;
//     case 'sqlserver':
//       return `[${identifier}]`;
//     default:
//       return identifier;
//   }
// }


export interface JsonToSqlOptions {
  tableName: string;
  includeCreateTable?: boolean;
}

export function convertJsonToSqlWithSchema(
  jsonInput: string | object,
  options: JsonToSqlOptions
): string {
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
    const values = columns.map(col =>
      formatValue(row[col])
    );
    return `(${values.join(',')})`;
  });

  sql += `INSERT INTO "${tableName}" (${columnList})\nVALUES\n${valuesList.join(',\n')};`;

  return sql;
}

/* ---------------------------------- */
/* Helpers */
/* ---------------------------------- */

function extractColumns(rows: any[]): string[] {
  const columnSet = new Set<string>();
  rows.forEach(row => {
    Object.keys(row).forEach(key => columnSet.add(key));
  });
  return Array.from(columnSet);
}

function detectSqlType(rows: any[], column: string): string {
  for (const row of rows) {
    const value = row[column];

    if (value === null || value === undefined) continue;

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

function formatValue(value: any): string {
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

function escapeString(value: string): string {
  return value.replace(/'/g, "''");
}