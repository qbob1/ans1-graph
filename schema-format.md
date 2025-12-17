# ASN.1 Schema Format

This document describes the JSON schema format used for importing ASN.1 structure definitions into the ASN.1 Graph Viewer.

## Overview

Schemas allow you to define the structure of your ASN.1 data, including:
- Field names and types
- Tag mappings (context-specific, application, etc.)
- Validation constraints
- Nested structures

When you apply a schema to decoded DER data, the viewer will:
1. Replace generic tag names with meaningful field names
2. Apply validation constraints automatically
3. Provide better visualization of your data structure

## Schema Structure

### Root Level Properties

```json
{
  "name": "SchemaName",           // Required: Unique identifier for the schema
  "version": "1.0",               // Optional: Version number
  "description": "Description",   // Optional: Human-readable description
  "root": { ... }                 // Required: Root structure definition
}
```

### Structure Definition

Each structure (root or nested) can have:

```json
{
  "name": "StructureName",        // Optional: Display name for this structure
  "type": "SEQUENCE",             // Optional: ASN.1 type (SEQUENCE, SET, etc.)
  "tag": {                        // Optional: Tag definition
    "class": 2,                   // Tag class: 0=Universal, 1=Application, 2=Context-specific, 3=Private
    "number": 0                   // Tag number
  },
  "optional": false,              // Optional: Whether this field is optional
  "fields": [ ... ],              // Optional: Array of field definitions (for SEQUENCE/SET)
  "itemSchema": { ... },          // Optional: Schema for array items (for SEQUENCE OF/SET OF)
  "constraints": { ... }          // Optional: Validation constraints
}
```

### Field Definitions

Fields within a SEQUENCE or SET:

```json
{
  "name": "fieldName",            // Required: Display name
  "type": "INTEGER",              // Required: ASN.1 type
  "tag": {                        // Optional: Tag definition
    "class": 2,
    "number": 0
  },
  "optional": true,               // Optional: Whether field is optional
  "constraints": {                // Optional: Validation rules
    "required": true,
    "min": 0,
    "max": 999999,
    "minLength": 1,
    "maxLength": 100,
    "pattern": "^[A-Z]+$",
    "enum": ["value1", "value2"]
  },
  "fields": [ ... ]               // Optional: For nested structures
}
```

## ASN.1 Type Mappings

Supported ASN.1 types:

### Universal Types (Tag Class 0)
- `BOOLEAN` - Boolean value
- `INTEGER` - Integer number
- `BIT STRING` - Bit string
- `OCTET STRING` - Byte array
- `NULL` - Null value
- `OBJECT IDENTIFIER` - OID
- `SEQUENCE` - Ordered collection of fields
- `SET` - Unordered collection of fields
- `UTF8String` - UTF-8 encoded string
- `PrintableString` - Printable ASCII string
- `IA5String` - IA5 (ASCII) string
- `UTCTime` - UTC timestamp
- `GeneralizedTime` - Generalized timestamp

### Custom Tags
For context-specific (class 2), application (class 1), or private (class 3) tags, use the `tag` property:

```json
{
  "tag": {
    "class": 2,    // Context-specific
    "number": 5    // Tag number [5]
  }
}
```

## Constraint Types

### Numeric Constraints
- `min`: Minimum value (for INTEGER)
- `max`: Maximum value (for INTEGER)

### String Constraints
- `minLength`: Minimum string length
- `maxLength`: Maximum string length
- `pattern`: Regular expression pattern (JavaScript regex syntax)

### General Constraints
- `required`: Field must have a value
- `enum`: Value must be one of the specified values (array)

## Example Schemas

### Simple User Record

```json
{
  "name": "SimpleUser",
  "version": "1.0",
  "root": {
    "name": "UserInfo",
    "type": "SEQUENCE",
    "fields": [
      {
        "name": "id",
        "type": "INTEGER",
        "tag": { "class": 2, "number": 0 },
        "constraints": {
          "required": true,
          "min": 1
        }
      },
      {
        "name": "username",
        "type": "UTF8String",
        "tag": { "class": 2, "number": 1 },
        "constraints": {
          "required": true,
          "minLength": 3,
          "maxLength": 32,
          "pattern": "^[a-zA-Z0-9_]+$"
        }
      }
    ]
  }
}
```

### Nested Structure with Repeated Elements

```json
{
  "name": "UserList",
  "version": "1.0",
  "root": {
    "name": "Users",
    "type": "SEQUENCE OF",
    "itemSchema": {
      "type": "SEQUENCE",
      "fields": [
        {
          "name": "userId",
          "type": "INTEGER"
        },
        {
          "name": "userName",
          "type": "UTF8String"
        }
      ]
    }
  }
}
```

## Using Schemas

### 1. Import a Schema

1. Open the control panel (☰ menu)
2. Scroll to "Schema Management" section
3. Click "📋 Import Schema"
4. Select your JSON schema file

### 2. Select Active Schema

1. Choose a schema from the "Active Schema" dropdown
2. The schema will be set as active but not yet applied

### 3. Apply Schema to Data

1. First, decode your hex DER data
2. Select the appropriate schema
3. Click "✓ Apply Schema to Data"
4. The graph will update with schema-defined field names and constraints

### 4. Clear Schemas

Click "✕ Clear All Schemas" to remove all loaded schemas.

## Best Practices

1. **Tag Matching**: Ensure your schema's tag numbers match your DER data structure
2. **Constraints**: Add constraints that match your data validation requirements
3. **Nested Structures**: Use the `fields` property for SEQUENCE/SET types
4. **Testing**: Test with sample data before applying to production DER files
5. **Versioning**: Use the `version` field to track schema changes
6. **Documentation**: Use the `description` field to document schema purpose

## Schema Validation

When importing a schema, the following validations are performed:

- Schema must be valid JSON
- Schema must have a `name` property
- Tag class must be 0, 1, 2, or 3
- Constraint values must be appropriate for their type

## Troubleshooting

### Schema doesn't match data
- Verify tag class and numbers match your DER structure
- Check that field order matches (for positional matching)
- Use the "Raw Data" view in node editor to inspect actual tags

### Constraints not working
- Ensure constraints are applied to the correct field
- Check that the constraint type matches the data type
- Verify pattern syntax for regex constraints

### Fields not renamed
- Apply the schema after decoding data
- Check that schema structure matches DER structure
- Verify tag matching is correct

## Example Workflow

1. Decode your DER data first (paste hex in control panel)
2. Create a schema JSON file matching your structure
3. Import the schema file
4. Select the schema from dropdown
5. Click "Apply Schema to Data"
6. Field names will update in the graph
7. Edit nodes to see applied constraints

## Advanced Features

### Dynamic Constraints
Schemas can reference the same validation rules used in manual constraint configuration. Any constraints defined in the schema will be merged with manually defined constraints.

### Schema Reuse
Import multiple schemas for different data types. Switch between them using the dropdown selector.

### Export Integration
Schemas work alongside the constraint export/import feature. You can:
- Import a schema to set initial field names
- Manually add/modify constraints
- Export the complete configuration for reuse
