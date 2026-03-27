declare function jsonToCsv(jsonData: any[]): string;

interface ComparisonStats {
    jsonTokens: number;
    csharpTokens: number;
    jsonSize: number;
    csharpSize: number;
    savings: number;
}
declare function convertJsonToCSharp(jsonString: string, rootClassName?: string): string;
declare function calculateComparison(jsonString: string, csharpString: string): ComparisonStats;
declare function isValidJson(str: string): boolean;

declare function jsonToDartModel(json: any, modelName?: string): string;

interface ExcelConversionStats {
    rowCount: number;
    columnCount: number;
    jsonSize: number;
    fileSizeEstimate: number;
}
declare function convertJsonToExcel(jsonString: string, fileName?: string): Promise<ExcelConversionStats>;

declare function jsonToGoStructFlexible(json: any, structName?: string): string;

interface JsonTableData {
    headers: string[];
    rows: Record<string, any>[];
}
declare function jsonToTable(jsonString: string): JsonTableData;
declare function tableDataToHtmlDocument(table: JsonTableData): string;
declare function generateHTMLTable(tableData: any): string;

declare function jsonToTsInterfaces(jsonInput: string | object, rootName?: string): string;

/**
 * Convert JSON string to Java class code
 * @param jsonString - JSON string input
 * @returns Java class code
 */
declare function jsonToJavaClass(jsonString: string): string;

declare function convertJsonToKotlin(jsonString: string, rootClassName?: string, nullable?: boolean): string;

declare function jsonToMongoQuery(json: any, collectionName?: string): string;

declare function jsonToMongooseModel(obj: any, modelName?: string): string;

declare function jsonToPhpArray(json: any, className?: string): string;

declare function convertJsonToPython(jsonString: string, rootClassName?: string): string;

interface JsonToSqlOptions {
    tableName: string;
    includeCreateTable?: boolean;
}
declare function convertJsonToSqlWithSchema(jsonInput: string | object, options: JsonToSqlOptions): string;

declare function jsonToSwiftModel(json: any, modelName?: string): string;

declare function jsonToToml(obj: any, parentKey?: string): string;

declare function convertJsonToToon(jsonString: string): string;

declare function jsonToXmlSafe(input: string | object, rootName?: string): string;

declare function jsonToYaml(input: any, indent?: number): string;

export { calculateComparison, convertJsonToCSharp, convertJsonToExcel, convertJsonToKotlin, convertJsonToPython, convertJsonToSqlWithSchema, convertJsonToToon, generateHTMLTable, isValidJson, jsonToCsv, jsonToDartModel, jsonToGoStructFlexible, jsonToJavaClass, jsonToMongoQuery, jsonToMongooseModel, jsonToPhpArray, jsonToSwiftModel, jsonToTable, jsonToToml, jsonToTsInterfaces, jsonToXmlSafe, jsonToYaml, tableDataToHtmlDocument };
export type { ComparisonStats, ExcelConversionStats, JsonTableData, JsonToSqlOptions };
