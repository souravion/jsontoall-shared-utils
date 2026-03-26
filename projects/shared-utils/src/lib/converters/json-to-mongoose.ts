export function jsonToMongooseModel(obj: any, modelName = "Model"): string {
  if (Array.isArray(obj)) {
    obj = obj[0]; // use first item for schema
  }

  const schemaBody = generateSchema(obj, 2);

  return `const mongoose = require("mongoose");

const ${modelName}Schema = new mongoose.Schema(${schemaBody});

module.exports = mongoose.model("${modelName}", ${modelName}Schema);`;
}

function generateSchema(obj: any, indent: number): string {
  const space = " ".repeat(indent);
  let schema = "{\n";

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    schema += `${space}${key}: ${resolveType(value, indent + 2)},\n`;
  }

  schema += "}";
  return schema;
}

function resolveType(value: any, indent: number): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[{ type: mongoose.Schema.Types.Mixed }]";
    return `[{ type: ${mapPrimitive(value[0])} }]`;
  }

  if (typeof value === "object" && value !== null) {
    return generateSchema(value, indent);
  }

  return `{ type: ${mapPrimitive(value)} }`;
}

function mapPrimitive(value: any): string {
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