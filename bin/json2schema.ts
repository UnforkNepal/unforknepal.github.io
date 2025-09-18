/**
 * json-to-schema.ts
 *
 * CLI tool that reads a JSON file and outputs:
 *   1) JSON Schema (Draft 7 style) with reusable definitions ($defs)
 *   2) TypeScript type definition (derived from the JSON Schema)
 *
 * Supports strict deduplication by default.
 * Optional looser array merging can be enabled via CLI flag `--loose-arrays`.
 * Root type name can be configured with `--root-name=YourTypeName`.
 *
 * Usage:
 *   deno run --allow-read --allow-write json-to-schema.ts input.json [--loose-arrays] [--root-name=Root]
 *
 * Outputs:
 *   - inferred_schema.json
 *   - inferred_types.d.ts
 */

const looseArrays = Deno.args.includes("--loose-arrays");
const rootArg = Deno.args.find((arg) => arg.startsWith("--root-name="));
const rootName = rootArg ? rootArg.split("=")[1] : "Root";

const typescriptDefinitionFile = Deno.args.find((arg) =>
  arg.startsWith("--typescript=")
);

const outputSchemaFile = Deno.args.find((arg) => arg.startsWith("--output="));

function inferType(value: any): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  switch (typeof value) {
    case "boolean":
      return "boolean";
    case "number":
      return Number.isInteger(value) ? "integer" : "number";
    case "string":
      return "string";
    case "object":
      return "object";
    default:
      return "unknown";
  }
}

// Data structure to track string values for potential enums
interface StringTracker {
  values: Set<string>;
  count: number;
}

const stringTrackers = new Map<string, StringTracker>();

function trackStringValue(path: string, value: string): void {
  if (!stringTrackers.has(path)) {
    stringTrackers.set(path, { values: new Set(), count: 0 });
  }
  const tracker = stringTrackers.get(path)!;
  tracker.values.add(value);
  tracker.count++;
}

// Global enum detection for fields that appear across multiple objects
const globalEnums = new Map<string, Set<string>>();

function trackGlobalEnum(fieldName: string, value: string): void {
  if (!globalEnums.has(fieldName)) {
    globalEnums.set(fieldName, new Set());
  }
  globalEnums.get(fieldName)!.add(value);
}

function shouldUseGlobalEnum(fieldName: string): boolean {
  const values = globalEnums.get(fieldName);
  if (!values) return false;

  // Skip certain field types that shouldn't have enums
  const skipFields = ["url", "id", "caseid", "relatedcaseid"];
  if (skipFields.includes(fieldName.toLowerCase())) return false;

  const uniqueCount = values.size;

  // Only create enums for repeating values with no spaces and reasonable size
  if (uniqueCount < 2 || uniqueCount > 10) return false;

  // Check if all values are repeating (appear multiple times) and have no spaces
  let totalOccurrences = 0;
  for (const value of values) {
    if (value.includes(" ")) return false; // Skip values with spaces
    // Count total occurrences of this value across all paths
    let count = 0;
    for (const tracker of stringTrackers.values()) {
      if (tracker.values.has(value)) {
        count += tracker.count;
      }
    }
    if (count < 2) return false; // Must appear at least twice
    totalOccurrences += count;
  }

  // Must have reasonable total occurrences
  return totalOccurrences >= uniqueCount * 2;
}

function getGlobalEnumValues(fieldName: string): string[] | null {
  if (!shouldUseGlobalEnum(fieldName)) return null;
  const values = globalEnums.get(fieldName);
  return values ? Array.from(values).sort() : null;
}

function shouldUseEnum(path: string): boolean {
  const tracker = stringTrackers.get(path);
  if (!tracker) return false;

  // Use enum if we have few unique values relative to total count
  // and we have at least 2 unique values and more than 3 total occurrences
  const uniqueCount = tracker.values.size;
  const totalCount = tracker.count;

  return uniqueCount >= 2 && totalCount > 3 &&
    uniqueCount <= Math.min(10, totalCount * 0.5);
}

function getEnumValues(path: string): string[] | null {
  // First try path-specific enum
  if (shouldUseEnum(path)) {
    const tracker = stringTrackers.get(path);
    return tracker ? Array.from(tracker.values).sort() : null;
  }

  // Then try global enum for field names like 'confidence'
  const fieldName = path.split(".").pop();
  if (fieldName && shouldUseGlobalEnum(fieldName)) {
    return getGlobalEnumValues(fieldName);
  }

  return null;
}

function mergeSchemas(a: any, b: any, strict = true): any {
  if (!a) return b;
  if (!b) return a;

  if (a.type === b.type) {
    if (a.type === "object") {
      const props: Record<string, any> = {};
      const allKeys = new Set([
        ...Object.keys(a.properties || {}),
        ...Object.keys(b.properties || {}),
      ]);
      for (const key of allKeys) {
        if (strict || !looseArrays) {
          if (key in a.properties && key in b.properties) {
            props[key] = mergeSchemas(
              a.properties[key],
              b.properties[key],
              strict,
            );
          } else {
            props[key] = a.properties[key] || b.properties[key];
          }
        }
      }
      return { type: "object", properties: props };
    }

    if (a.type === "array") {
      if (strict) {
        return { type: "array", items: mergeSchemas(a.items, b.items, strict) };
      } else {
        return { type: "array", items: mergeSchemas(a.items, b.items, false) };
      }
    }

    return a;
  }

  return { type: [a.type, b.type].flat() };
}

function inferSchemaFromValue(value: any, path = ""): any {
  const t = inferType(value);
  switch (t) {
    case "object": {
      const props: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        const propPath = path ? `${path}.${k}` : k;
        props[k] = inferSchemaFromValue(v, propPath);
      }
      return { type: "object", properties: props };
    }
    case "array": {
      let merged: any = null;
      for (const item of value.slice(0, 10)) {
        merged = mergeSchemas(merged, inferSchemaFromValue(item, path), true);
      }
      return { type: "array", items: merged || {} };
    }
    case "string": {
      // Track string values for potential enum detection
      trackStringValue(path, value);

      // Also track global enums for field names
      const fieldName = path.split(".").pop();
      if (fieldName) {
        trackGlobalEnum(fieldName, value);
      }

      return { type: t };
    }
    default:
      return { type: t };
  }
}

function inferSchema(doc: any): any {
  if (Array.isArray(doc)) {
    let merged: any = null;
    for (const item of doc.slice(0, 200)) {
      merged = mergeSchemas(merged, inferSchemaFromValue(item), true);
    }
    return merged;
  } else {
    return inferSchemaFromValue(doc);
  }
}

// --- JSON Schema with $defs + TypeScript generation ---
function schemaToTS(
  schema: any,
  rootName: string,
): { ts: string; schema: any } {
  const lines: string[] = [];
  const seen = new Map<any, string>();
  const defs: Record<string, any> = {};

  // Track enum usage across fields for common enum extraction
  const enumUsage = new Map<string, Set<string>>();
  const enumDefinitions = new Map<string, string[]>();

  function titleCase(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function uniqueName(base: string): string {
    let name = base;
    let i = 1;
    while ([...seen.values()].includes(name) || defs[name]) {
      name = base + i;
      i++;
    }
    return name;
  }

  function walk(s: any, name: string, keyHint?: string, path = ""): string {
    if (!s) return "any";
    if (Array.isArray(s.type)) {
      return s.type.map((t: string) =>
        walk({ type: t, ...s }, name, keyHint, path)
      )
        .join(" | ");
    }
    switch (s.type) {
      case "string": {
        // Check if this path should use an enum
        const enumValues = getEnumValues(path);
        if (enumValues) {
          // Create a unique key for this enum
          const enumKey = enumValues.sort().join("|");

          // Track usage of this enum
          if (!enumUsage.has(enumKey)) {
            enumUsage.set(enumKey, new Set());
            enumDefinitions.set(enumKey, enumValues);
          }
          enumUsage.get(enumKey)!.add(path);

          // Create enum type name
          const fieldName = path.split(".").pop() || "Enum";
          const enumTypeName = titleCase(fieldName) + "Type";

          return enumTypeName;
        }
        return "string";
      }
      case "integer":
        return "number";
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      case "null":
        return "null";
      case "array": {
        const subtypeName = uniqueName(titleCase(keyHint || name) + "Item");
        const itemPath = path ? `${path}[]` : "[]";
        const tsType = walk(s.items, subtypeName, keyHint, itemPath);
        defs[subtypeName] = s.items || { type: "any" };
        return `${tsType}[]`;
      }
      case "object": {
        if (seen.has(s)) return seen.get(s)!;
        const typeName = uniqueName(titleCase(keyHint || name));
        seen.set(s, typeName);
        defs[typeName] = s;
        const props = s.properties || {};
        const fields = Object.entries(props).map(([k, v]) => {
          const propPath = path ? `${path}.${k}` : k;
          return `${k}: ${walk(v, typeName + titleCase(k), k, propPath)};`;
        });
        lines.push(`export type ${typeName} =  { ${fields.join(" ")} }`);
        return typeName;
      }
      default:
        return "any";
    }
  }

  const rootType = walk(schema, rootName, undefined, "");

  // Update schema to include enums
  function addEnumsToSchema(s: any, path = ""): any {
    if (!s) return s;
    if (Array.isArray(s.type)) {
      return {
        ...s,
        type: s.type.map((t: string) => {
          if (t === "string") {
            const enumValues = getEnumValues(path);
            if (enumValues) {
              return { type: "string", enum: enumValues };
            }
          }
          return t;
        }),
      };
    }
    switch (s.type) {
      case "string": {
        const enumValues = getEnumValues(path);
        if (enumValues) {
          return { ...s, enum: enumValues };
        }
        return s;
      }
      case "array": {
        const itemPath = path ? `${path}[]` : "[]";
        return {
          ...s,
          items: addEnumsToSchema(s.items, itemPath),
        };
      }
      case "object": {
        const newProps: Record<string, any> = {};
        for (const [k, v] of Object.entries(s.properties || {})) {
          const propPath = path ? `${path}.${k}` : k;
          newProps[k] = addEnumsToSchema(v, propPath);
        }
        return {
          ...s,
          properties: newProps,
        };
      }
      default:
        return s;
    }
  }

  const schemaWithEnums = addEnumsToSchema(schema);

  // Generate enum type definitions
  const enumLines: string[] = [];
  for (const [enumKey, paths] of enumUsage) {
    if (paths.size > 1) { // Only create separate types for enums used in multiple places
      const enumValues = enumDefinitions.get(enumKey);
      if (enumValues) {
        // Use the most common field name for the enum type
        const fieldNames = Array.from(paths).map((p) =>
          p.split(".").pop() || "Enum"
        );
        const commonFieldName = fieldNames[0]; // Use first field name
        const enumTypeName = titleCase(commonFieldName) + "Type";
        const unionType = enumValues.map((v) => `"${v}"`).join(" | ");
        enumLines.push(`export type ${enumTypeName} = ${unionType};`);
      }
    }
  }

  const schemaWithDefs = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $ref: `#/$defs/${rootName}`,
    $defs: {
      ...Object.fromEntries(Object.entries(defs).map(([k, v]) => [k, v])),
      [rootName]: schemaWithEnums,
    },
  };

  // Combine enum definitions with regular types
  const allLines = [...enumLines, ...lines];
  return { ts: allLines.join("\n\n"), schema: schemaWithDefs };
}

// --- CLI ---
const infile = Deno.args[0];
if (!infile) {
  console.error(
    "Usage: deno run --allow-read --allow-write json-to-schema.ts input.json [--loose-arrays] [--root-name=Root]",
  );
  Deno.exit(1);
}

const data = JSON.parse(await Deno.readTextFile(infile));
const baseSchema = inferSchema(data);
const { ts, schema } = schemaToTS(baseSchema, rootName);

if (outputSchemaFile) {
  await Deno.writeTextFile(
    outputSchemaFile.split("=")[1],
    JSON.stringify(schema, null, 2),
  );
} else {
  console.log(JSON.stringify(schema, null, 2));
}

if (typescriptDefinitionFile) {
  await Deno.writeTextFile(typescriptDefinitionFile.split("=")[1], ts);
}

// Make this file a module for top-level await
export {};
