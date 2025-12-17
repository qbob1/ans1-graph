/**
 * ASN.1 Schema Parser
 * Parses ASN.1 schema definition files (.asn, .asn1) into JSON format
 */

class ASN1SchemaParser {
  /**
   * Parse ASN.1 schema text into JSON schema format
   * @param {string} schemaText - Raw ASN.1 schema text
   * @param {string} schemaName - Name for the schema
   * @returns {Object} Parsed schema in JSON format
   */
  static parse(schemaText, schemaName = 'Imported Schema') {
    // Remove all comments (both full-line and inline)
    const cleanedText = this.removeComments(schemaText);

    // Extract module name if present
    const moduleMatch = cleanedText.match(/(\w+)\s+DEFINITIONS\s+::=\s+BEGIN/);
    const moduleName = moduleMatch ? moduleMatch[1] : schemaName;

    // Find type definitions
    const typeDefinitions = this.extractTypeDefinitions(cleanedText);

    if (typeDefinitions.length === 0) {
      throw new Error('No type definitions found in schema');
    }

    // Use the first type definition as root
    const root = typeDefinitions[0];

    return {
      name: moduleName,
      version: "1.0",
      description: `Imported from ASN.1 schema file`,
      root: root,
      allTypes: typeDefinitions
    };
  }

  /**
   * Remove comments from ASN.1 text
   * @param {string} text - Raw ASN.1 text
   * @returns {string} Text with comments removed
   */
  static removeComments(text) {
    // Remove full-line comments and inline comments
    const lines = text.split('\n');
    const cleanedLines = lines.map(line => {
      // Remove inline comments (everything after --)
      const commentIndex = line.indexOf('--');
      if (commentIndex !== -1) {
        return line.substring(0, commentIndex);
      }
      return line;
    }).filter(line => line.trim() !== '');

    return cleanedLines.join('\n');
  }

  /**
   * Extract type definitions from schema text
   * @param {string} text - Schema text
   * @returns {Array} Array of type definitions
   */
  static extractTypeDefinitions(text) {
    const definitions = [];

    // Match type definitions: TypeName ::= TYPE { ... }
    const typeRegex = /(\w+)\s+::=\s+(SEQUENCE|SET|CHOICE|INTEGER|BOOLEAN|OCTET STRING|BIT STRING|UTF8String|IA5String|PrintableString|OBJECT IDENTIFIER|NULL)(?:\s+\{([^}]+)\})?/g;

    let match;
    while ((match = typeRegex.exec(text)) !== null) {
      const [, typeName, baseType, fieldsText] = match;

      const definition = {
        name: typeName,
        type: baseType
      };

      // Parse fields if present
      if (fieldsText && (baseType === 'SEQUENCE' || baseType === 'SET' || baseType === 'CHOICE')) {
        definition.fields = this.parseFields(fieldsText);
      }

      definitions.push(definition);
    }

    return definitions;
  }

  /**
   * Parse field definitions
   * @param {string} fieldsText - Text containing field definitions
   * @returns {Array} Array of field definitions
   */
  static parseFields(fieldsText) {
    const fields = [];

    // Split by comma, but be careful with nested structures
    const fieldLines = fieldsText.split(',').map(f => f.trim()).filter(f => f);

    for (const fieldLine of fieldLines) {
      const field = this.parseField(fieldLine);
      if (field) {
        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * Parse a single field definition
   * @param {string} fieldText - Field definition text
   * @returns {Object} Field definition
   */
  static parseField(fieldText) {
    // Match: fieldName [tag] TYPE (OPTIONAL)?
    const fieldMatch = fieldText.match(/(\w+)\s+(?:\[(\d+)\]\s+)?(\w+(?:\s+\w+)?)\s*(OPTIONAL)?/);

    if (!fieldMatch) {
      return null;
    }

    const [, fieldName, tagNumber, fieldType, optional] = fieldMatch;

    const field = {
      name: fieldName,
      type: fieldType.trim()
    };

    // Add tag if present
    if (tagNumber !== undefined) {
      field.tag = {
        class: 2, // Context-specific by default
        number: parseInt(tagNumber)
      };
    }

    // Add optional flag
    if (optional) {
      field.optional = true;
    }

    // Add default constraints based on type
    field.constraints = this.getDefaultConstraints(fieldType.trim());

    return field;
  }

  /**
   * Get default constraints for a type
   * @param {string} type - ASN.1 type
   * @returns {Object} Default constraints
   */
  static getDefaultConstraints(type) {
    const constraints = {};

    switch (type) {
      case 'INTEGER':
        constraints.min = 0;
        break;
      case 'UTF8String':
      case 'IA5String':
      case 'PrintableString':
        constraints.maxLength = 255;
        break;
      case 'OCTET STRING':
        constraints.maxLength = 1024;
        break;
    }

    return Object.keys(constraints).length > 0 ? constraints : undefined;
  }

  /**
   * Parse constraints from text (SIZE, FROM, etc.)
   * @param {string} text - Constraint text
   * @returns {Object} Constraints object
   */
  static parseConstraints(text) {
    const constraints = {};

    // SIZE constraint
    const sizeMatch = text.match(/SIZE\s*\((\d+)\.\.(\d+)\)/);
    if (sizeMatch) {
      constraints.minLength = parseInt(sizeMatch[1]);
      constraints.maxLength = parseInt(sizeMatch[2]);
    }

    // VALUE constraint for INTEGER
    const valueMatch = text.match(/\((\d+)\.\.(\d+)\)/);
    if (valueMatch) {
      constraints.min = parseInt(valueMatch[1]);
      constraints.max = parseInt(valueMatch[2]);
    }

    return constraints;
  }
}

// Export for use in web components
if (typeof window !== 'undefined') {
  window.ASN1SchemaParser = ASN1SchemaParser;
}

export { ASN1SchemaParser };
