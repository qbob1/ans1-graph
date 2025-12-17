# Erlang ASN.1 Profile Analyzer

This utility analyzes compiled ASN.1 profiles from Erlang and extracts tag definitions and constraints.

## Overview

Erlang's ASN.1 compiler generates `.erl` and `.hrl` files containing:
- Record definitions with field types
- Type specifications
- Encoding/decoding functions
- ASN.1 schema information in comments

The analyzer parses these files and extracts:
- Field names and their tags
- ASN.1 types
- Constraints (SIZE, ranges, etc.)
- Optional/required flags
- Default values

## Supported File Formats

### .erl Files (Erlang Source)
Compiled ASN.1 modules with:
- `-record` definitions
- Type specifications (`::`)
- ASN.1 schema comments

### .hrl Files (Erlang Headers)
Header files containing record definitions and type exports.

## How It Works

### 1. Record Parsing

The analyzer extracts Erlang record definitions:

```erlang
-record('UserRecord', {
    userId :: integer(),
    userName :: binary(),
    isActive = true :: boolean()
}).
```

Converts to:
```json
{
  "name": "UserRecord",
  "type": "SEQUENCE",
  "fields": [
    {
      "name": "userId",
      "type": "INTEGER",
      "tag": { "class": 2, "number": 0 }
    },
    {
      "name": "userName",
      "type": "OCTET STRING",
      "tag": { "class": 2, "number": 1 }
    },
    {
      "name": "isActive",
      "type": "BOOLEAN",
      "tag": { "class": 2, "number": 2 },
      "optional": true
    }
  ]
}
```

### 2. Type Mapping

Erlang types are mapped to ASN.1 types:

| Erlang Type | ASN.1 Type |
|-------------|------------|
| `integer()` | INTEGER |
| `binary()` | OCTET STRING |
| `bitstring()` | BIT STRING |
| `boolean()` | BOOLEAN |
| `atom()` | ENUMERATED |
| `string()` | UTF8String |
| `list()` | SEQUENCE OF |
| `tuple()` | SEQUENCE |

### 3. Constraint Extraction

Constraints from ASN.1 comments are parsed:

```erlang
%% userName [1] UTF8String (SIZE(1..100))
```

Extracts:
```json
{
  "minLength": 1,
  "maxLength": 100
}
```

```erlang
%% accountType [3] INTEGER (0..3)
```

Extracts:
```json
{
  "min": 0,
  "max": 3
}
```

### 4. Tag Assignment

- Tags are assigned by field position (context-specific tags)
- Tag class defaults to 2 (context-specific)
- Tag numbers start at 0

## Usage

### Importing Erlang Profiles

1. **Open Control Panel** (☰ menu)
2. **Navigate to Schema Management** section
3. **Click "🔧 Import Erlang Profile"**
4. **Select one or more .erl or .hrl files**
5. **Profiles are analyzed** and converted to schemas
6. **Tag map is generated** automatically

### Exporting Tag Maps

After importing Erlang profiles:

1. **Click "📊 Export Tag Map"**
2. **Tag map JSON file** is downloaded
3. **File contains** tag → field name mappings

Tag map format:
```json
{
  "2:0": {
    "name": "userId",
    "type": "INTEGER",
    "parentType": "UserRecord",
    "optional": false,
    "constraints": {
      "min": 0
    }
  },
  "2:1": {
    "name": "userName",
    "type": "UTF8String",
    "parentType": "UserRecord",
    "optional": false,
    "constraints": {
      "minLength": 1,
      "maxLength": 100
    }
  }
}
```

## Example Workflow

### 1. Prepare Erlang Files

Ensure your `.erl` files contain:
- Record definitions with type specs
- ASN.1 schema information in comments

### 2. Import to Viewer

```javascript
// Files are processed automatically in the UI
// Or programmatically:
const analyzer = window.ErlangASN1Analyzer;
const schemas = analyzer.analyzeProfiles([
  { name: 'UserAuth', content: erlangCode }
]);
```

### 3. Generate Tag Map

```javascript
const tagMap = analyzer.generateTagMap(schemas);
console.log(tagMap);
```

### 4. Apply to Data

Once imported, schemas can be:
- Selected from the dropdown
- Applied to decoded DER data
- Used to rename generic tags to field names

## Advanced Features

### Multiple Profile Files

Import multiple related files at once:
- Profile dependencies are resolved
- All types are extracted
- Unified tag map is generated

### Custom Type Detection

The analyzer recognizes:
- Custom record types as SEQUENCE
- List types as SEQUENCE OF
- Atom types as ENUMERATED
- Nested record references

### Constraint Types Supported

- **SIZE constraints**: `SIZE(min..max)` or `SIZE(n)`
- **Value ranges**: `(min..max)`
- **Default values**: Marked as optional
- **OPTIONAL fields**: Detected from `undefined` or default values

## Troubleshooting

### No Types Found

**Problem**: "No type definitions found in Erlang profile"

**Solutions**:
- Ensure file contains `-record` definitions
- Check that record definitions use proper syntax
- Verify ASN.1 comments are present

### Type Mapping Issues

**Problem**: Fields have generic "OCTET STRING" type

**Solutions**:
- Add type specifications with `::`
- Include ASN.1 schema comments
- Use explicit type annotations

### Missing Constraints

**Problem**: Constraints not extracted

**Solutions**:
- Add ASN.1 comments with constraint syntax
- Use standard SIZE and range formats
- Place constraints in ASN.1 comment sections

## Sample Files

### sample-erlang-profile.erl

Example Erlang ASN.1 compiled profile included in repository:
- UserRecord with multiple fields
- SessionInfo for authentication
- Credentials with security constraints
- ProfileData with optional fields

### Testing

1. Import `sample-erlang-profile.erl`
2. View extracted schemas
3. Generate and download tag map
4. Apply to sample DER data

## Integration

### With Schema Viewer

Imported Erlang profiles appear in the schema list with:
- 👁️ clickable icons to view definitions
- Full field details with tags
- Constraint information
- ASN.1 syntax display

### With Tag Application

Apply Erlang-derived schemas to:
- Decoded DER data
- Replace generic tag names
- Show field constraints
- Enable validation

## Best Practices

1. **Include ASN.1 Comments**
   - Add original ASN.1 schema as comments
   - Use standard ASN.1 syntax
   - Include all constraint information

2. **Use Type Specifications**
   - Add `::` type annotations to all fields
   - Use specific types (not just `term()`)
   - Match ASN.1 types when possible

3. **Group Related Types**
   - Import related profiles together
   - Use consistent naming conventions
   - Document dependencies

4. **Version Control**
   - Keep original ASN.1 schemas
   - Version compiled profiles
   - Track tag assignments

5. **Validate Extracted Data**
   - Review generated schemas
   - Check tag mappings
   - Test with real DER data

## API Reference

### ErlangASN1Analyzer.parseErlangProfile(code, name)

Parse a single Erlang profile file.

**Parameters**:
- `code` (string): Erlang source code
- `name` (string): Profile name

**Returns**: Schema object

### ErlangASN1Analyzer.analyzeProfiles(files)

Analyze multiple profile files.

**Parameters**:
- `files` (Array): Array of `{name, content}` objects

**Returns**: Array of schemas

### ErlangASN1Analyzer.generateTagMap(schemas)

Generate tag mapping from schemas.

**Parameters**:
- `schemas` (Array): Array of schema objects

**Returns**: Tag map object

## Future Enhancements

Planned features:
- Support for CHOICE types
- Nested record resolution
- Type reference following
- Constraint inheritance
- Custom tag class detection
- Automatic tag optimization
