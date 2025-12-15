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

    // Extract record definitions
    const records = this.extractRecords(erlangCode);

    // Extract type definitions
    const types = this.extractTypes(erlangCode);

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

    if (!fieldStr) return null;

    // Pattern: fieldName :: Type
    // Pattern: fieldName = DefaultValue :: Type
    // Pattern: fieldName

    let fieldName = '';
    let fieldType = 'OCTET STRING';
    let optional = false;
    let defaultValue = null;
    let constraints = {};

    // Check for type annotation (:: Type)
    const typeMatch = fieldStr.match(/^(\w+)(?:\s*=\s*([^:]+))?\s*::\s*(.+)$/);

    if (typeMatch) {
      fieldName = typeMatch[1];
      defaultValue = typeMatch[2] ? typeMatch[2].trim() : null;
      fieldType = this.parseErlangType(typeMatch[3].trim());
    } else {
      // Simple field name
      const simpleMatch = fieldStr.match(/^(\w+)(?:\s*=\s*(.+))?$/);
      if (simpleMatch) {
        fieldName = simpleMatch[1];
        defaultValue = simpleMatch[2] ? simpleMatch[2].trim() : null;
      }
    }

    // Check if optional (has default value or marked as optional)
    optional = defaultValue !== null || fieldStr.includes('undefined') || fieldStr.includes('asn1_NOVALUE');

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

    files.forEach(file => {
      try {
        const schema = this.parseErlangProfile(file.content, file.name);
        schemas.push(schema);
      } catch (error) {
        console.error(`Error parsing ${file.name}:`, error.message);
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
