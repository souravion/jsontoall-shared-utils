/* ------------------------------------ */
/* 🔹 Table Data Model */
/* ------------------------------------ */

export interface JsonTableData {
  headers: string[];
  rows: Record<string, any>[];
}

/* ------------------------------------ */
/* 🔹 JSON → Table Data (For Angular UI) */
/* ------------------------------------ */

export function jsonToTable(jsonString: string): JsonTableData {
  const parsed = JSON.parse(jsonString);

  let dataArray: any[] = [];

  if (Array.isArray(parsed)) {
    dataArray = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    dataArray = [parsed];
  } else {
    throw new Error('JSON must be an object or array of objects');
  }

  const flattened = dataArray.map(item => flattenObject(item));

  const headerSet = new Set<string>();
  flattened.forEach(obj =>
    Object.keys(obj).forEach(key => headerSet.add(key))
  );

  return {
    headers: Array.from(headerSet),
    rows: flattened
  };
}

/* ------------------------------------ */
/* 🔹 Table Data → Standalone HTML File */
/* ------------------------------------ */

export function tableDataToHtmlDocument(
  table: JsonTableData
): string {

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

function flattenObject(
  obj: any,
  parentKey: string = '',
  result: Record<string, any> = {}
): Record<string, any> {
  for (const key in obj) {
    const newKey = parentKey ? `${parentKey}.${key}` : key;

    if (
      obj[key] &&
      typeof obj[key] === 'object' &&
      !Array.isArray(obj[key])
    ) {
      flattenObject(obj[key], newKey, result);
    } else {
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

function escapeHtml(value: any): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateHTMLTable(tableData: any): string {
  if (!tableData || !tableData.headers || !tableData.rows) {
    return '';
  }

  const headerRow = tableData.headers
    .map((h: string) => `<th>${h}</th>`)
    .join('');

  const bodyRows = tableData.rows
    .map((row: any) => {
      const cols = tableData.headers
        .map((h: string) => `<td>${row[h] ?? ''}</td>`)
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