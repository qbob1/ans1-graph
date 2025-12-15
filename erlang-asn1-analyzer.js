/**
 * Erlang ASN.1 Profile Analyzer
 * Parses compiled ASN.1 profiles from Erlang and extracts tags and constraints
 */

class ErlangASN1Analyzer {
  /**
   * Parse Erlang ASN.1 compiled output
   * @param {string} erlangCode - Erlang compiled ASN.1 code (.erl or .hrl content)
   * @param {string} profileName - Name for the profile
   * @returns {Object} Extracted schema in JSON format
   */
  static parseErlangProfile(erlangCode, profileName = 'ErlangProfile') {
    const schemas = [];

    // Extract record definitions from .hrl files
    const records = this.extractRecords(erlangCode);
    console.log(`📝 Extracted ${records.length} record definitions from ${profileName}`);

    // Extract type information from .erl comment annotations
    const typeAnnotations = this.extractTypeAnnotations(erlangCode);

    // Extract type definitions from comments
    const types = this.extractTypes(erlangCode);

    // Merge type annotations into records
    if (Object.keys(typeAnnotations).length > 0) {
      console.log(`📊 Found type annotations for ${Object.keys(typeAnnotations).length} records`);

      records.forEach(record => {
        const recordAnnotations = typeAnnotations[record.name];
        if (recordAnnotations) {
          const annotationCount = Object.keys(recordAnnotations).length;
          console.log(`  ✓ Merging ${annotationCount} type annotations into ${record.name}`);

          record.fields.forEach(field => {
            const annotation = recordAnnotations[field.name];
            if (annotation) {
              // Override field type with annotation type
              if (annotation.type) {
                field.type = annotation.type;
              }
              // Override optional flag
              if (annotation.optional !== undefined) {
                field.optional = annotation.optional;
              }
              // Use explicit tag number if available
              if (annotation.tagNumber !== undefined) {
                field.tag.number = annotation.tagNumber;
              }
            }
          });
        } else {
          console.log(`  ⚠️ No type annotations found for ${record.name} (fields will default to OCTET STRING)`);
        }
      });
    } else {
      console.log(`⚠️ No type annotations extracted from .erl file - all fields will use inferred or default types`);
    }

    // Merge records and types
    const allDefinitions = [...records, ...types];

    if (allDefinitions.length === 0) {
      throw new Error('No type definitions found in Erlang profile');
    }

    // Convert each definition to schema format
    allDefinitions.forEach(def => {
      schemas.push(this.convertToSchema(def));
    });

    return {
      name: profileName,
      version: "1.0",
      description: "Imported from Erlang ASN.1 compiled profile",
      root: schemas[0],
      allTypes: schemas
    };
  }

  /**
   * Extract record definitions from Erlang code
   * @param {string} code - Erlang code
   * @returns {Array} Array of record definitions
   */
  static extractRecords(code) {
    const records = [];

    // Match: -record(RecordName, { field1, field2, ... }).
    const recordRegex = /-record\((?:'([^']+)'|(\w+)),\s*\{([^}]+)\}\)\./g;

    let match;
    while ((match = recordRegex.exec(code)) !== null) {
      const recordName = match[1] || match[2];
      const fieldsText = match[3];

      const fields = this.parseRecordFields(fieldsText);

      records.push({
        name: recordName,
        type: 'SEQUENCE',
        fields: fields,
        source: 'record'
      });
    }

    return records;
  }

  /**
   * Parse fields from record definition
   * @param {string} fieldsText - Fields text from record
   * @returns {Array} Array of field definitions
   */
  static parseRecordFields(fieldsText) {
    const fields = [];

    // Split by comma, handling nested structures
    const fieldStrings = this.splitFields(fieldsText);

    fieldStrings.forEach((fieldStr, index) => {
      const field = this.parseField(fieldStr.trim(), index);
      if (field) {
        fields.push(field);
      }
    });

    return fields;
  }

  /**
   * Parse a single field definition
   * @param {string} fieldStr - Field definition string
   * @param {number} index - Field index for default tag
   * @returns {Object} Field definition
   */
  static parseField(fieldStr, index) {
    // Remove leading/trailing whitespace
    fieldStr = fieldStr.trim();

    // Remove inline comments
    const commentIndex = fieldStr.indexOf('%');
    if (commentIndex !== -1) {
      fieldStr = fieldStr.substring(0, commentIndex).trim();
    }

    if (!fieldStr) return null;

    // Pattern: 'field-name' :: Type
    // Pattern: fieldName :: Type
    // Pattern: 'field-name' = DefaultValue :: Type
    // Pattern: fieldName = DefaultValue
    // Pattern: 'field-name'
    // Pattern: fieldName

    let fieldName = '';
    let fieldType = 'OCTET STRING';
    let optional = false;
    let defaultValue = null;
    let constraints = {};

    // Check for type annotation (:: Type)
    // Match field names with or without quotes, with or without hyphens
    const typeMatch = fieldStr.match(/^(['"]?[\w-]+['"]?)(?:\s*=\s*([^:]+))?\s*::\s*(.+)$/);

    if (typeMatch) {
      // Has type annotation
      fieldName = typeMatch[1].replace(/['"]/g, ''); // Remove quotes if present
      defaultValue = typeMatch[2] ? typeMatch[2].trim() : null;
      fieldType = this.parseErlangType(typeMatch[3].trim());
    } else {
      // No type annotation - just field name and maybe default value
      const simpleMatch = fieldStr.match(/^(['"]?[\w-]+['"]?)(?:\s*=\s*(.+))?$/);
      if (simpleMatch) {
        fieldName = simpleMatch[1].replace(/['"]/g, ''); // Remove quotes if present
        defaultValue = simpleMatch[2] ? simpleMatch[2].trim() : null;

        // Try to infer type from default value
        if (defaultValue) {
          fieldType = this.inferTypeFromDefault(defaultValue);
        }
      }
    }

    if (!fieldName) return null;

    // Check if optional (has default value or marked as optional)
    optional = defaultValue !== null ||
               fieldStr.includes('asn1_NOVALUE') ||
               fieldStr.includes('asn1_DEFAULT') ||
               fieldStr.includes('undefined');

    // Extract constraints from type
    const constraintsMatch = fieldType.match(/\{([^}]+)\}/);
    if (constraintsMatch) {
      constraints = this.parseConstraints(constraintsMatch[1]);
      fieldType = fieldType.replace(/\{[^}]+\}/, '').trim();
    }

    return {
      name: fieldName,
      type: fieldType,
      tag: {
        class: 2, // Context-specific by default
        number: index
      },
      optional: optional,
      constraints: Object.keys(constraints).length > 0 ? constraints : undefined
    };
  }

  /**
   * Infer ASN.1 type from Erlang default value
   * @param {string} defaultValue - Default value string
   * @returns {string} ASN.1 type
   */
  static inferTypeFromDefault(defaultValue) {
    // asn1_NOVALUE, asn1_DEFAULT - generic, can't infer
    if (defaultValue.includes('asn1_')) {
      return 'OCTET STRING';
    }

    // true/false - BOOLEAN
    if (defaultValue === 'true' || defaultValue === 'false') {
      return 'BOOLEAN';
    }

    // Numeric - INTEGER
    if (/^-?\d+$/.test(defaultValue)) {
      return 'INTEGER';
    }

    // Binary - OCTET STRING
    if (defaultValue.startsWith('<<') || defaultValue.startsWith('binary')) {
      return 'OCTET STRING';
    }

    // Atom - could be ENUMERATED or identifier
    if (defaultValue.match(/^[a-z][\w]*$/)) {
      return 'ENUMERATED';
    }

    return 'OCTET STRING';
  }

  /**
   * Parse Erlang type to ASN.1 type
   * @param {string} erlangType - Erlang type string
   * @returns {string} ASN.1 type
   */
  static parseErlangType(erlangType) {
    const typeMap = {
      'integer': 'INTEGER',
      'binary': 'OCTET STRING',
      'bitstring': 'BIT STRING',
      'boolean': 'BOOLEAN',
      'atom': 'ENUMERATED',
      'string': 'UTF8String',
      'list': 'SEQUENCE OF',
      'tuple': 'SEQUENCE',
      'record': 'SEQUENCE',
      'oid': 'OBJECT IDENTIFIER',
      'null': 'NULL'
    };

    // Check for known type mappings
    const lowerType = erlangType.toLowerCase();
    for (const [erlType, asnType] of Object.entries(typeMap)) {
      if (lowerType.includes(erlType)) {
        return asnType;
      }
    }

    // Check for explicit ASN.1 types in Erlang format
    if (erlangType.includes('IA5String')) return 'IA5String';
    if (erlangType.includes('PrintableString')) return 'PrintableString';
    if (erlangType.includes('UTF8String')) return 'UTF8String';
    if (erlangType.includes('GeneralizedTime')) return 'GeneralizedTime';
    if (erlangType.includes('UTCTime')) return 'UTCTime';

    return 'OCTET STRING';
  }

  /**
   * Parse constraints from text
   * @param {string} text - Constraints text
   * @returns {Object} Constraints object
   */
  static parseConstraints(text) {
    const constraints = {};

    // SIZE constraint: SIZE(min..max)
    const sizeMatch = text.match(/SIZE\s*\(\s*(\d+)\s*\.\.\s*(\d+)\s*\)/i);
    if (sizeMatch) {
      constraints.minLength = parseInt(sizeMatch[1]);
      constraints.maxLength = parseInt(sizeMatch[2]);
    }

    // Single SIZE: SIZE(n)
    const singleSizeMatch = text.match(/SIZE\s*\(\s*(\d+)\s*\)/i);
    if (singleSizeMatch && !sizeMatch) {
      constraints.minLength = parseInt(singleSizeMatch[1]);
      constraints.maxLength = parseInt(singleSizeMatch[1]);
    }

    // Value range: (min..max)
    const rangeMatch = text.match(/\(\s*(\d+)\s*\.\.\s*(\d+)\s*\)/);
    if (rangeMatch && !sizeMatch) {
      constraints.min = parseInt(rangeMatch[1]);
      constraints.max = parseInt(rangeMatch[2]);
    }

    return constraints;
  }

  /**
   * Extract type annotations from .erl file comments
   * Format: %% attribute fieldName(tagNumber) with type TYPE [OPTIONAL]
   * @param {string} code - Erlang code
   * @returns {Object} Map of recordName -> fieldName -> {type, optional, tagNumber}
   */
  static extractTypeAnnotations(code) {
    const annotations = {};
    let currentRecord = null;

    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect record context from section headers like "%%  PEHeader" or "%%  PE-Dummy"
      // These appear after %%==== separator lines
      const headerMatch = line.match(/^%%\s+([\w-]+(?:_[\w-]+)*)$/);
      if (headerMatch) {
        // Extract record name, handling underscores in compound names
        currentRecord = headerMatch[1];
        // Normalize underscores to hyphens for matching with record names
        // e.g., "ProfileHeader_eUICC-Mandatory-AIDs" -> keep as is for now
        if (!annotations[currentRecord]) {
          annotations[currentRecord] = {};
        }
        continue;
      }

      // Also detect from function names as fallback
      const funcMatch = line.match(/^(?:dec|enc)_([\w-]+)\s*\(/);
      if (funcMatch) {
        currentRecord = funcMatch[1];
        if (!annotations[currentRecord]) {
          annotations[currentRecord] = {};
        }
        continue;
      }

      // Extract field type annotations
      // Format: %% attribute fieldName(tagNumber) with type TYPE [OPTIONAL]
      // TYPE can be multi-word like "OCTET STRING" or "SEQUENCE OF"
      const attrMatch = line.match(/^%%+\s*attribute\s+([\w-]+)\((\d+)\)\s+with\s+type\s+(.+?)$/i);
      if (attrMatch && currentRecord) {
        const fieldName = attrMatch[1];
        const tagNumber = parseInt(attrMatch[2]);
        let fieldType = attrMatch[3].trim();

        // Check if OPTIONAL or DEFAULT at the end
        let optional = false;
        if (fieldType.match(/\s+(OPTIONAL|DEFAULT)$/i)) {
          optional = true;
          fieldType = fieldType.replace(/\s+(OPTIONAL|DEFAULT)$/i, '').trim();
        }

        // Clean up type name (normalize multiple spaces to single space)
        fieldType = fieldType.replace(/\s+/g, ' ');

        // Map type names to standard ASN.1 types
        fieldType = this.normalizeASN1Type(fieldType);

        if (!annotations[currentRecord]) {
          annotations[currentRecord] = {};
        }

        annotations[currentRecord][fieldName] = {
          type: fieldType,
          optional: optional,
          tagNumber: tagNumber
        };
      }
    }

    return annotations;
  }

  /**
   * Normalize ASN.1 type names from Erlang comments
   * @param {string} typeName - Type name from comment
   * @returns {string} Normalized ASN.1 type
   */
  static normalizeASN1Type(typeName) {
    // Handle common variations
    const typeMap = {
      'NULL': 'NULL',
      'INTEGER': 'INTEGER',
      'BOOLEAN': 'BOOLEAN',
      'OCTET STRING': 'OCTET STRING',
      'BIT STRING': 'BIT STRING',
      'UTF8String': 'UTF8String',
      'IA5String': 'IA5String',
      'PrintableString': 'PrintableString',
      'GeneralizedTime': 'GeneralizedTime',
      'UTCTime': 'UTCTime',
      'OBJECT IDENTIFIER': 'OBJECT IDENTIFIER',
      'SEQUENCE': 'SEQUENCE',
      'SEQUENCE OF': 'SEQUENCE OF',
      'SET': 'SET',
      'SET OF': 'SET OF',
      'CHOICE': 'CHOICE',
      'ENUMERATED': 'ENUMERATED'
    };

    return typeMap[typeName] || typeName;
  }

  /**
   * Extract type definitions (exported functions that define types)
   * @param {string} code - Erlang code
   * @returns {Array} Array of type definitions
   */
  static extractTypes(code) {
    const types = [];

    // Look for type definitions in comments or exported functions
    // Erlang ASN.1 compiler often generates type info in comments
    const typeCommentRegex = /%+\s*(\w+)\s+::=\s+(SEQUENCE|SET|CHOICE|INTEGER|OCTET STRING|UTF8String|IA5String)/g;

    let match;
    while ((match = typeCommentRegex.exec(code)) !== null) {
      types.push({
        name: match[1],
        type: match[2],
        fields: [],
        source: 'comment'
      });
    }

    return types;
  }

  /**
   * Split fields by comma, handling nested structures
   * @param {string} text - Fields text
   * @returns {Array} Array of field strings
   */
  static splitFields(text) {
    const fields = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if ((char === '"' || char === "'") && text[i - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '{' || char === '(' || char === '[') {
          depth++;
        } else if (char === '}' || char === ')' || char === ']') {
          depth--;
        } else if (char === ',' && depth === 0) {
          fields.push(current.trim());
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      fields.push(current.trim());
    }

    return fields;
  }

  /**
   * Convert definition to schema format
   * @param {Object} def - Definition object
   * @returns {Object} Schema format
   */
  static convertToSchema(def) {
    return {
      name: def.name,
      type: def.type,
      fields: def.fields || []
    };
  }

  /**
   * Analyze multiple profile files
   * @param {Array} files - Array of {name, content} objects
   * @returns {Array} Array of schemas
   */
  static analyzeProfiles(files) {
    const schemas = [];

    // Group files by base name (profile.erl and profile.hrl should be paired)
    const fileGroups = {};

    files.forEach(file => {
      const baseName = file.name.replace(/\.(erl|hrl)$/i, '');
      if (!fileGroups[baseName]) {
        fileGroups[baseName] = {};
      }

      if (file.name.match(/\.erl$/i)) {
        fileGroups[baseName].erl = file.content;
      } else if (file.name.match(/\.hrl$/i)) {
        fileGroups[baseName].hrl = file.content;
      }
    });

    // Process each group
    Object.keys(fileGroups).forEach(baseName => {
      const group = fileGroups[baseName];

      try {
        // Combine .erl and .hrl content if both are available
        let combinedContent = '';

        if (group.erl) {
          combinedContent += group.erl + '\n';
        }

        if (group.hrl) {
          combinedContent += group.hrl + '\n';
        }

        if (combinedContent) {
          const schema = this.parseErlangProfile(combinedContent, baseName);
          schemas.push(schema);
        }
      } catch (error) {
        console.error(`Error parsing ${baseName}:`, error.message);
      }
    });

    return schemas;
  }

  /**
   * Generate tag map from schemas
   * @param {Array} schemas - Array of schemas
   * @returns {Object} Tag map with tag -> field name mapping
   */
  static generateTagMap(schemas) {
    const tagMap = {};

    schemas.forEach(schema => {
      if (schema.allTypes) {
        schema.allTypes.forEach(type => {
          if (type.fields) {
            type.fields.forEach(field => {
              if (field.tag) {
                const tagKey = `${field.tag.class}:${field.tag.number}`;
                tagMap[tagKey] = {
                  name: field.name,
                  type: field.type,
                  parentType: type.name,
                  optional: field.optional,
                  constraints: field.constraints
                };
              }
            });
          }
        });
      }
    });

    return tagMap;
  }
}

// Export for use in web components
if (typeof window !== 'undefined') {
  window.ErlangASN1Analyzer = ErlangASN1Analyzer;
}

export { ErlangASN1Analyzer };
