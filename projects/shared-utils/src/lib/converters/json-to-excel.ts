
// =============================
// TYPES
// =============================
export interface ExcelConversionStats {
  rowCount: number;
  columnCount: number;
  jsonSize: number;
  fileSizeEstimate: number;
}

// =============================
// MAIN EXPORT FUNCTION
// =============================
export async function convertJsonToExcel(
  jsonString: string,
  fileName: string = 'data'
): Promise<ExcelConversionStats> {

  if (!jsonString.trim()) {
    throw new Error('JSON input is empty.');
  }

  const parsed = JSON.parse(jsonString);

  // Ensure array format (Excel works best with arrays)
  const jsonArray = Array.isArray(parsed) ? parsed : [parsed];

  // Flatten nested objects
  const flattenedData = jsonArray.map(item => flattenObject(item));

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
    type:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
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
function flattenObject(
  obj: any,
  parentKey: string = '',
  result: any = {}
): any {

  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;

    const newKey = parentKey ? `${parentKey}.${key}` : key;

    if (
      typeof obj[key] === 'object' &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      flattenObject(obj[key], newKey, result);
    } else {
      result[newKey] = Array.isArray(obj[key])
        ? obj[key].join(', ')
        : obj[key];
    }
  }

  return result;
}